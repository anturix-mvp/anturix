use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{DuelState, DuelStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelCancelled;

pub fn handler(ctx: Context<ExpireCancelDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Pending, AnturixError::InvalidDuelStatus);

    let clock = Clock::get()?;
    require!(clock.unix_timestamp >= duel.expires_at, AnturixError::DuelNotExpired);

    let amount = ctx.accounts.escrow.lamports();
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
                to: ctx.accounts.creator.to_account_info(),
            },
            &[escrow_seeds],
        ),
        amount,
    )?;

    duel.status = DuelStatus::Cancelled;

    emit!(DuelCancelled {
        duel: duel.key(),
        reason: "expired".to_string(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ExpireCancelDuel<'info> {
    pub cranker: Signer<'info>,

    /// CHECK: creator receives refund — validated against duel_state
    #[account(
        mut,
        constraint = creator.key() == duel_state.creator @ AnturixError::InvalidDuelStatus,
    )]
    pub creator: SystemAccount<'info>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,

    /// CHECK: escrow PDA
    #[account(
        mut,
        seeds = [SEED_ESCROW, duel_state.key().as_ref()],
        bump = duel_state.escrow_bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
