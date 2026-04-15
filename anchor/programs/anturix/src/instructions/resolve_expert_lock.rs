use anchor_lang::prelude::*;
use crate::state::{ExpertLockState, ExpertLockStatus, UserProfile};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::ExpertLockResolved;

pub fn handler(ctx: Context<ResolveExpertLock>, correct: bool) -> Result<()> {
    let lock = &mut ctx.accounts.expert_lock;

    require!(lock.status == ExpertLockStatus::Revealed, AnturixError::InvalidExpertLockStatus);

    lock.result_correct = Some(correct);
    lock.status = ExpertLockStatus::Resolved;

    let profile = &mut ctx.accounts.expert_profile;
    profile.total_predictions = profile.total_predictions
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    if correct {
        profile.correct_predictions = profile.correct_predictions
            .checked_add(1)
            .ok_or(AnturixError::Overflow)?;
    }

    emit!(ExpertLockResolved {
        lock: lock.key(),
        correct,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveExpertLock<'info> {
    #[account(
        constraint = admin.key() == ADMIN_PUBKEY @ AnturixError::UnauthorizedAdmin
    )]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub expert_lock: Account<'info, ExpertLockState>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, expert_lock.expert.as_ref()],
        bump = expert_profile.bump,
    )]
    pub expert_profile: Account<'info, UserProfile>,
}
