use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{DuelState, DuelStatus, UserProfile};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelAccepted;

pub fn handler(ctx: Context<AcceptDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Pending, AnturixError::InvalidDuelStatus);

    let clock = Clock::get()?;
    require!(clock.unix_timestamp < duel.expires_at, AnturixError::DuelExpired);

    let opponent_key = ctx.accounts.opponent.key();
    require!(opponent_key != duel.creator, AnturixError::SelfDuel);

    // If targeted duel, check opponent matches
    if duel.opponent != Pubkey::default() {
        require!(opponent_key == duel.opponent, AnturixError::WrongOpponent);
    }

    // Transfer stake to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.opponent.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        duel.stake_amount,
    )?;

    duel.opponent = opponent_key;
    duel.status = DuelStatus::Active;

    emit!(DuelAccepted {
        duel: duel.key(),
        opponent: opponent_key,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AcceptDuel<'info> {
    #[account(mut)]
    pub opponent: Signer<'info>,

    /// Opponent must have a profile
    #[account(
        seeds = [SEED_PROFILE, opponent.key().as_ref()],
        bump = opponent_profile.bump,
    )]
    pub opponent_profile: Account<'info, UserProfile>,

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
