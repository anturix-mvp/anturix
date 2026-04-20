use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{DuelState, DuelStatus, Position, Side};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::RefundClaimed;

pub fn handler(ctx: Context<ClaimRefund>, _side: Side) -> Result<()> {
    let duel = &ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Cancelled, AnturixError::InvalidDuelStatus);

    let position = &ctx.accounts.position;
    let amount = position.stake;

    let duel_key = duel.key();
    let escrow_seeds: &[&[u8]] = &[
        SEED_ESCROW,
        duel_key.as_ref(),
        &[duel.escrow_bump],
    ];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
            },
            &[escrow_seeds],
        ),
        amount,
    )?;

    emit!(RefundClaimed {
        duel: duel_key,
        owner: ctx.accounts.owner.key(),
        amount,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(side: Side)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub duel_state: Account<'info, DuelState>,

    #[account(
        mut,
        close = owner,
        seeds = [
            SEED_POSITION,
            duel_state.key().as_ref(),
            owner.key().as_ref(),
            &[side as u8],
        ],
        bump = position.bump,
        constraint = position.owner == owner.key() @ AnturixError::AlreadyClaimed,
    )]
    pub position: Account<'info, Position>,

    /// CHECK: escrow PDA
    #[account(
        mut,
        seeds = [SEED_ESCROW, duel_state.key().as_ref()],
        bump = duel_state.escrow_bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
