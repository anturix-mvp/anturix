use anchor_lang::prelude::*;
use crate::state::{UserProfile, ExpertLockState, ExpertLockStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::ExpertLockCreated;

pub fn handler(
    ctx: Context<CreateExpertLock>,
    prediction_hash: [u8; 32],
    fee: u64,
    event_id: String,
    expires_at: i64,
) -> Result<()> {
    require!(fee > 0, AnturixError::InvalidFee);
    require!(event_id.len() <= MAX_EVENT_ID_LEN, AnturixError::EventIdTooLong);

    let clock = Clock::get()?;
    require!(expires_at > clock.unix_timestamp, AnturixError::InvalidExpiry);

    let expert_profile = &ctx.accounts.expert_profile;
    require!(
        expert_profile.banter_wins >= MIN_BANTER_WINS_FOR_EXPERT,
        AnturixError::InsufficientBanterWins
    );

    let lock = &mut ctx.accounts.expert_lock;
    lock.expert = ctx.accounts.expert.key();
    lock.event_id = event_id.clone();
    lock.prediction_hash = prediction_hash;
    lock.fee = fee;
    lock.status = ExpertLockStatus::Active;
    lock.result_correct = None;
    lock.expires_at = expires_at;
    lock.bump = ctx.bumps.expert_lock;

    emit!(ExpertLockCreated {
        lock: lock.key(),
        expert: ctx.accounts.expert.key(),
        event_id,
        fee,
        expires_at,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(prediction_hash: [u8; 32], fee: u64, event_id: String)]
pub struct CreateExpertLock<'info> {
    #[account(mut)]
    pub expert: Signer<'info>,

    #[account(
        seeds = [SEED_PROFILE, expert.key().as_ref()],
        bump = expert_profile.bump,
    )]
    pub expert_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = expert,
        space = ExpertLockState::SIZE,
        seeds = [SEED_EXPERT_LOCK, expert.key().as_ref(), event_id.as_bytes()],
        bump,
    )]
    pub expert_lock: Account<'info, ExpertLockState>,

    pub system_program: Program<'info, System>,
}
