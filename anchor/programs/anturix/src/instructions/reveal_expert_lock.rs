use anchor_lang::prelude::*;
use sha2::{Sha256, Digest};
use crate::state::{ExpertLockState, ExpertLockStatus};
use crate::errors::AnturixError;
use crate::events::ExpertLockRevealed;

pub fn handler(
    ctx: Context<RevealExpertLock>,
    prediction: String,
    salt: [u8; 16],
) -> Result<()> {
    let lock = &mut ctx.accounts.expert_lock;

    require!(lock.status == ExpertLockStatus::Active, AnturixError::InvalidExpertLockStatus);

    // Verify hash: SHA256(prediction || salt) == stored hash
    let mut hasher = Sha256::new();
    hasher.update(prediction.as_bytes());
    hasher.update(&salt);
    let computed: [u8; 32] = hasher.finalize().into();

    require!(computed == lock.prediction_hash, AnturixError::HashMismatch);

    lock.status = ExpertLockStatus::Revealed;

    emit!(ExpertLockRevealed {
        lock: lock.key(),
        prediction,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RevealExpertLock<'info> {
    pub expert: Signer<'info>,

    #[account(
        mut,
        constraint = expert_lock.expert == expert.key() @ AnturixError::InvalidExpertLockStatus,
    )]
    pub expert_lock: Account<'info, ExpertLockState>,
}
