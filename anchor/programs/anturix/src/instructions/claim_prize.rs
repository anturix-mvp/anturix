use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{DuelState, DuelStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::PrizeClaimed;

pub fn handler(ctx: Context<ClaimPrize>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Resolved, AnturixError::InvalidDuelStatus);
    require!(
        duel.winner == Some(ctx.accounts.winner.key()),
        AnturixError::NotWinner
    );

    let amount = ctx.accounts.escrow.lamports();

    // Drain escrow to winner via invoke_signed
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
                to: ctx.accounts.winner.to_account_info(),
            },
            &[escrow_seeds],
        ),
        amount,
    )?;

    duel.status = DuelStatus::Claimed;

    emit!(PrizeClaimed {
        duel: duel.key(),
        winner: ctx.accounts.winner.key(),
        amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

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
