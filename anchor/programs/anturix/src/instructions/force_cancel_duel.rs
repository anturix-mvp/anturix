use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{DuelState, DuelStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelCancelled;

pub fn handler(ctx: Context<ForceCancelDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(
        duel.status == DuelStatus::Pending || duel.status == DuelStatus::Active,
        AnturixError::InvalidDuelStatus
    );

    let duel_key = duel.key();
    let escrow_seeds: &[&[u8]] = &[
        SEED_ESCROW,
        duel_key.as_ref(),
        &[duel.escrow_bump],
    ];

    if duel.status == DuelStatus::Pending {
        // Refund all to creator
        let amount = ctx.accounts.escrow.lamports();
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
    } else {
        // Active: refund stake_amount to each, dust to creator
        let stake = duel.stake_amount;
        let total = ctx.accounts.escrow.lamports();

        // Opponent gets their stake back
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.opponent.to_account_info(),
                },
                &[escrow_seeds],
            ),
            stake,
        )?;

        // Creator gets their stake + any dust (rent)
        let remainder = total.checked_sub(stake).ok_or(AnturixError::Overflow)?;
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
                &[escrow_seeds],
            ),
            remainder,
        )?;
    }

    duel.status = DuelStatus::Cancelled;

    emit!(DuelCancelled {
        duel: duel.key(),
        reason: "admin_force".to_string(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ForceCancelDuel<'info> {
    #[account(
        constraint = admin.key() == ADMIN_PUBKEY @ AnturixError::UnauthorizedAdmin
    )]
    pub admin: Signer<'info>,

    /// CHECK: creator — validated against duel_state
    #[account(
        mut,
        constraint = creator.key() == duel_state.creator @ AnturixError::InvalidDuelStatus,
    )]
    pub creator: SystemAccount<'info>,

    /// CHECK: opponent — validated against duel_state
    #[account(
        mut,
        constraint = opponent.key() == duel_state.opponent @ AnturixError::InvalidDuelStatus,
    )]
    pub opponent: SystemAccount<'info>,

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
