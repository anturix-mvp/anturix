use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{DuelState, DuelStatus, UserProfile, PositionTicket, Side, DuelMode};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelAccepted;

pub fn handler(
    ctx: Context<AcceptDuel>,
    side: crate::state::Side,
    amount: u64,
) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(amount >= MIN_STAKE, AnturixError::InvalidStakeAmount);
    require!(duel.status == DuelStatus::Pending || duel.status == DuelStatus::Active, AnturixError::InvalidDuelStatus);

    let clock = Clock::get()?;
    require!(clock.unix_timestamp < duel.expires_at, AnturixError::DuelExpired);

    let opponent_key = ctx.accounts.opponent.key();
    require!(opponent_key != duel.creator, AnturixError::SelfDuel);

    let escrow_before = ctx.accounts.escrow.lamports();
    let escrow_after = escrow_before
        .checked_add(amount)
        .ok_or(AnturixError::Overflow)?;

    let side_pool = match side {
        Side::Up => duel.pool_up_total,
        Side::Down => duel.pool_down_total,
    };

    let total_pool = duel
        .pool_up_total
        .checked_add(duel.pool_down_total)
        .ok_or(AnturixError::Overflow)?;

    let base_odds_bps = if side_pool == 0 {
        DEFAULT_START_ODDS_BPS
    } else {
        let raw = (u128::from(total_pool)
            .checked_mul(u128::from(ODDS_SCALE_BPS))
            .ok_or(AnturixError::Overflow)?
            .checked_div(u128::from(side_pool))
            .ok_or(AnturixError::Overflow)?) as u64;
        raw.clamp(MIN_LOCKED_ODDS_BPS, MAX_LOCKED_ODDS_BPS)
    };

    let existing_side_liability = match side {
        Side::Up => duel.locked_payout_up_total,
        Side::Down => duel.locked_payout_down_total,
    };

    let max_additional_liability = escrow_after
        .checked_sub(existing_side_liability)
        .ok_or(AnturixError::InsufficientLiquidity)?;

    let max_odds_bps = (u128::from(max_additional_liability)
        .checked_mul(u128::from(ODDS_SCALE_BPS))
        .ok_or(AnturixError::Overflow)?
        .checked_div(u128::from(amount))
        .ok_or(AnturixError::Overflow)?) as u64;

    let locked_odds_bps = base_odds_bps.min(max_odds_bps);
    require!(locked_odds_bps >= MIN_LOCKED_ODDS_BPS, AnturixError::InsufficientLiquidity);

    let potential_payout = (u128::from(amount)
        .checked_mul(u128::from(locked_odds_bps))
        .ok_or(AnturixError::Overflow)?
        .checked_div(u128::from(ODDS_SCALE_BPS))
        .ok_or(AnturixError::Overflow)?) as u64;

    // Mode-specific logic
    match duel.mode {
        DuelMode::Private1v1 => {
            // Strict 1v1: match exact creator stake
            require!(amount == duel.stake_amount, AnturixError::WrongStakeAmount);
            
            if duel.opponent != Pubkey::default() {
                require!(opponent_key == duel.opponent, AnturixError::WrongOpponent);
            }
            
            duel.opponent = opponent_key;
            duel.status = DuelStatus::Active;
        },
        DuelMode::PublicArena => {
            if duel.status == DuelStatus::Pending {
                duel.status = DuelStatus::Active;
            }
        }
    }

    match side {
        Side::Up => {
            duel.pool_up_total = duel
                .pool_up_total
                .checked_add(amount)
                .ok_or(AnturixError::Overflow)?;
            duel.locked_payout_up_total = duel
                .locked_payout_up_total
                .checked_add(potential_payout)
                .ok_or(AnturixError::Overflow)?;
        }
        Side::Down => {
            duel.pool_down_total = duel
                .pool_down_total
                .checked_add(amount)
                .ok_or(AnturixError::Overflow)?;
            duel.locked_payout_down_total = duel
                .locked_payout_down_total
                .checked_add(potential_payout)
                .ok_or(AnturixError::Overflow)?;
        }
    }

    let post_liability = duel
        .locked_payout_up_total
        .max(duel.locked_payout_down_total);
    require!(post_liability <= escrow_after, AnturixError::InsufficientLiquidity);

    let ticket = &mut ctx.accounts.ticket;
    ticket.duel = duel.key();
    ticket.owner = opponent_key;
    ticket.side = side.clone();
    ticket.amount = amount;
    ticket.locked_odds_bps = locked_odds_bps;
    ticket.potential_payout = potential_payout;
    ticket.claimed = false;
    ticket.created_at = clock.unix_timestamp;
    ticket.bump = ctx.bumps.ticket;

    duel.next_ticket_id = duel
        .next_ticket_id
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    // Transfer stake to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.opponent.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        amount,
    )?;

    emit!(DuelAccepted {
        duel: duel.key(),
        opponent: opponent_key,
        side: if matches!(side, Side::Up) { 0 } else { 1 },
        amount,
        locked_odds_bps,
        potential_payout,
    });

    Ok(())
}


#[derive(Accounts)]
pub struct AcceptDuel<'info> {
    #[account(mut)]
    pub opponent: Signer<'info>,

    /// Opponent must have a profile
    #[account(
        seeds = [SEED_PROFILE, opponent.key().as_ref()],
        bump = opponent_profile.bump,
    )]
    pub opponent_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,

    #[account(
        init,
        payer = opponent,
        space = PositionTicket::SIZE,
        seeds = [SEED_TICKET, duel_state.key().as_ref(), &duel_state.next_ticket_id.to_le_bytes()],
        bump,
    )]
    pub ticket: Account<'info, PositionTicket>,

    /// CHECK: escrow PDA
    #[account(
        mut,
        seeds = [SEED_ESCROW, duel_state.key().as_ref()],
        bump = duel_state.escrow_bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
