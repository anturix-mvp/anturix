use anchor_lang::prelude::*;
use crate::state::{DuelState, DuelStatus, Condition, Side};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelResolved;
use crate::pyth;

/// Permissionless -- anyone (cranker, creator, opponent) can call this.
/// The Pyth oracle determines the winner automatically.
pub fn handler(ctx: Context<ResolveDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Active, AnturixError::InvalidDuelStatus);

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= duel.expires_at,
        AnturixError::DuelNotExpired
    );

    // Read primary oracle price
    let pyth_price = pyth::parse_price_update(
        &ctx.accounts.price_update.to_account_info(),
        &duel.price_feed_id,
        &clock,
    )?;

    // Determine winner based on condition
    let condition_met = match duel.condition {
        Condition::Above => pyth_price.price > duel.target_price,
        Condition::Below => pyth_price.price < duel.target_price,

        Condition::Odd => {
            let last_digit = (pyth_price.price % 10).unsigned_abs();
            last_digit % 2 == 1
        }
        Condition::Even => {
            let last_digit = (pyth_price.price % 10).unsigned_abs();
            last_digit % 2 == 0
        }

        Condition::InRange => {
            pyth_price.price >= duel.lower_bound && pyth_price.price <= duel.upper_bound
        }
        Condition::OutOfRange => {
            pyth_price.price < duel.lower_bound || pyth_price.price > duel.upper_bound
        }

        Condition::AssetRace => {
            // Read second feed from remaining_accounts
            require!(
                !ctx.remaining_accounts.is_empty(),
                AnturixError::MissingPriceAccount
            );
            let pyth_price_b = pyth::parse_price_update(
                &ctx.remaining_accounts[0],
                &duel.price_feed_id_b,
                &clock,
            )?;

            // % gain in basis points: (end - start) * 10000 / start
            // Using i64 arithmetic. Negative gain = price dropped.
            let gain_a = (pyth_price.price.checked_sub(duel.start_price_a).ok_or(AnturixError::Overflow)?)
                .checked_mul(10000).ok_or(AnturixError::Overflow)?
                .checked_div(duel.start_price_a).ok_or(AnturixError::Overflow)?;

            let gain_b = (pyth_price_b.price.checked_sub(duel.start_price_b).ok_or(AnturixError::Overflow)?)
                .checked_mul(10000).ok_or(AnturixError::Overflow)?
                .checked_div(duel.start_price_b).ok_or(AnturixError::Overflow)?;

            // Creator's asset A outperformed asset B
            gain_a > gain_b
        }
    };

    let creator_wins = condition_met;
    duel.winning_side = if creator_wins {
        duel.creator_side.clone()
    } else {
        match duel.creator_side {
            Side::Up => Side::Down,
            Side::Down => Side::Up,
        }
    };

    let (winner, loser) = if creator_wins {
        (duel.creator, duel.opponent)
    } else {
        (duel.opponent, duel.creator)
    };

    duel.winner = Some(winner);
    duel.status = DuelStatus::Resolved;

    emit!(DuelResolved {
        duel: duel.key(),
        winner,
        loser,
        oracle_price: pyth_price.price,
        oracle_exponent: pyth_price.exponent,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveDuel<'info> {
    /// Anyone can resolve -- permissionless (cranker, participant, etc.)
    pub resolver: Signer<'info>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,

    /// CHECK: Pyth PriceUpdateV2 account -- validated in handler via pyth::parse_price_update
    pub price_update: UncheckedAccount<'info>,
}
