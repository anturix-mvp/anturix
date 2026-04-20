use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::errors::AnturixError;
use crate::state::{DuelMode, DuelState, DuelStatus, PositionTicket};

pub fn handler(ctx: Context<ClaimTicket>) -> Result<()> {
    let duel = &ctx.accounts.duel_state;
    let ticket = &mut ctx.accounts.ticket;

    require!(duel.mode == DuelMode::PublicArena, AnturixError::InvalidDuelStatus);
    require!(duel.status == DuelStatus::Resolved || duel.status == DuelStatus::Claimed, AnturixError::InvalidDuelStatus);
    require!(ticket.duel == duel.key(), AnturixError::InvalidTicket);
    require!(ticket.owner == ctx.accounts.owner.key(), AnturixError::InvalidTicket);
    require!(!ticket.claimed, AnturixError::TicketAlreadyClaimed);
    require!(ticket.side == duel.winning_side, AnturixError::NotWinner);

    let payout = ticket.potential_payout;
    require!(ctx.accounts.escrow.lamports() >= payout, AnturixError::InsufficientLiquidity);

    let duel_key = duel.key();
    let escrow_seeds: &[&[u8]] = &[SEED_ESCROW, duel_key.as_ref(), &[duel.escrow_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
            },
            &[escrow_seeds],
        ),
        payout,
    )?;

    ticket.claimed = true;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimTicket<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,

    #[account(mut)]
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
