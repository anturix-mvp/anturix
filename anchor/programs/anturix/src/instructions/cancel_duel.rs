use anchor_lang::prelude::*;
use crate::state::{DuelState, DuelStatus, Side};
use crate::errors::AnturixError;
use crate::events::DuelCancelled;

/// Creator-initiated early cancel. Allowed only while the opposite side has
/// zero liquidity. Positions on the creator's side (including the creator's)
/// withdraw via `claim_refund`.
pub fn handler(ctx: Context<CancelDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Open, AnturixError::InvalidDuelStatus);

    let opposite_total = match duel.creator_side {
        Side::OptionA => duel.side_b_total,
        Side::OptionB => duel.side_a_total,
    };
    require!(opposite_total == 0, AnturixError::OppositeSideNotEmpty);

    duel.status = DuelStatus::Cancelled;

    emit!(DuelCancelled {
        duel: duel.key(),
        reason: "creator".to_string(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CancelDuel<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        constraint = duel_state.creator == creator.key() @ AnturixError::InvalidDuelStatus,
    )]
    pub duel_state: Account<'info, DuelState>,
}
