use anchor_lang::prelude::*;
use crate::state::{DuelState, DuelStatus, Condition, UserProfile};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelResolved;
use crate::pyth;

/// Permissionless — anyone (cranker, creator, opponent) can call this.
/// The Pyth oracle determines the winner automatically.
pub fn handler(ctx: Context<ResolveDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Active, AnturixError::InvalidDuelStatus);

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= duel.expires_at,
        AnturixError::DuelNotExpired
    );

    // Read oracle price
    let pyth_price = pyth::parse_price_update(
        &ctx.accounts.price_update.to_account_info(),
        &duel.price_feed_id,
        &clock,
    )?;

    // Determine winner: creator bets condition is true
    let condition_met = match duel.condition {
        Condition::Above => pyth_price.price > duel.target_price,
        Condition::Below => pyth_price.price < duel.target_price,
    };

    let (winner, loser) = if condition_met {
        (duel.creator, duel.opponent)
    } else {
        (duel.opponent, duel.creator)
    };

    duel.winner = Some(winner);
    duel.status = DuelStatus::Resolved;

    // Update winner profile
    let winner_profile = if winner == duel.creator {
        &mut ctx.accounts.creator_profile
    } else {
        &mut ctx.accounts.opponent_profile
    };
    winner_profile.wins = winner_profile.wins
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    // Update loser profile
    let loser_profile = if loser == duel.creator {
        &mut ctx.accounts.creator_profile
    } else {
        &mut ctx.accounts.opponent_profile
    };
    loser_profile.losses = loser_profile.losses
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;
    loser_profile.clown_until = clock.unix_timestamp
        .checked_add(CLOWN_DURATION)
        .ok_or(AnturixError::Overflow)?;

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
    /// Anyone can resolve — permissionless (cranker, participant, etc.)
    pub resolver: Signer<'info>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,

    /// CHECK: Pyth PriceUpdateV2 account — validated in handler via pyth::parse_price_update
    pub price_update: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, duel_state.creator.as_ref()],
        bump = creator_profile.bump,
    )]
    pub creator_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, duel_state.opponent.as_ref()],
        bump = opponent_profile.bump,
    )]
    pub opponent_profile: Account<'info, UserProfile>,
}
