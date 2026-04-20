use anchor_lang::prelude::*;
use crate::state::{DuelState, DuelStatus};
use crate::constants::ADMIN_PUBKEY;
use crate::errors::AnturixError;
use crate::events::DuelCancelled;

/// Admin escape hatch for stuck duels (bad Pyth feed, etc).
/// Sets status = Cancelled. Positions refund via `claim_refund`.
pub fn handler(ctx: Context<ForceCancelDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Open, AnturixError::InvalidDuelStatus);

    duel.status = DuelStatus::Cancelled;

    emit!(DuelCancelled {
        duel: duel.key(),
        reason: "force".to_string(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ForceCancelDuel<'info> {
    #[account(
        constraint = admin.key() == ADMIN_PUBKEY @ AnturixError::UnauthorizedAdmin
    )]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,
}
