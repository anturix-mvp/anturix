use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{ExpertLockState, ExpertLockStatus};
use crate::errors::AnturixError;
use crate::events::ExpertLockPurchased;

pub fn handler(ctx: Context<BuyExpertLock>) -> Result<()> {
    let lock = &ctx.accounts.expert_lock;

    require!(lock.status == ExpertLockStatus::Active, AnturixError::InvalidExpertLockStatus);

    let clock = Clock::get()?;
    require!(clock.unix_timestamp < lock.expires_at, AnturixError::ExpertLockExpired);

    // Direct P2P transfer — no escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.expert.to_account_info(),
            },
        ),
        lock.fee,
    )?;

    emit!(ExpertLockPurchased {
        lock: lock.key(),
        buyer: ctx.accounts.buyer.key(),
        fee: lock.fee,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BuyExpertLock<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: expert wallet — validated against expert_lock
    #[account(
        mut,
        constraint = expert.key() == expert_lock.expert @ AnturixError::InvalidExpertLockStatus,
    )]
    pub expert: SystemAccount<'info>,

    pub expert_lock: Account<'info, ExpertLockState>,

    pub system_program: Program<'info, System>,
}
