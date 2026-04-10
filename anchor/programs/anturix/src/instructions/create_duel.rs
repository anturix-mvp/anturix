use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{UserProfile, DuelState, DuelStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelCreated;

pub fn handler(
    ctx: Context<CreateDuel>,
    event_id: String,
    prediction: String,
    stake_amount: u64,
    target_opponent: Option<Pubkey>,
    expires_at: i64,
) -> Result<()> {
    require!(stake_amount >= MIN_STAKE, AnturixError::StakeTooLow);
    require!(event_id.len() <= MAX_EVENT_ID_LEN, AnturixError::EventIdTooLong);
    require!(prediction.len() <= MAX_PREDICTION_LEN, AnturixError::PredictionTooLong);

    let clock = Clock::get()?;
    require!(expires_at > clock.unix_timestamp, AnturixError::InvalidExpiry);

    let creator_profile = &mut ctx.accounts.creator_profile;
    let duel = &mut ctx.accounts.duel_state;

    duel.creator = ctx.accounts.creator.key();
    duel.opponent = target_opponent.unwrap_or(Pubkey::default());
    duel.event_id = event_id.clone();
    duel.stake_amount = stake_amount;
    duel.status = DuelStatus::Pending;
    duel.winner = None;
    duel.expires_at = expires_at;
    duel.bump = ctx.bumps.duel_state;
    duel.escrow_bump = ctx.bumps.escrow;

    // Transfer stake to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        stake_amount,
    )?;

    creator_profile.duel_count = creator_profile.duel_count
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    emit!(DuelCreated {
        duel: duel.key(),
        creator: ctx.accounts.creator.key(),
        event_id,
        stake_amount,
        prediction,
        target_opponent,
        expires_at,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateDuel<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, creator.key().as_ref()],
        bump = creator_profile.bump,
    )]
    pub creator_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = creator,
        space = DuelState::SIZE,
        seeds = [SEED_DUEL, creator.key().as_ref(), &creator_profile.duel_count.to_le_bytes()],
        bump,
    )]
    pub duel_state: Account<'info, DuelState>,

    /// CHECK: escrow PDA — system-owned, holds stake SOL
    #[account(
        mut,
        seeds = [SEED_ESCROW, duel_state.key().as_ref()],
        bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
