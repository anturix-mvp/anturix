use anchor_lang::prelude::*;
use crate::state::{DuelState, DuelStatus, UserProfile};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelResolved;

pub fn handler(ctx: Context<ResolveDuel>, winner: Pubkey) -> Result<()> {
    let duel = &mut ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Active, AnturixError::InvalidDuelStatus);
    require!(
        winner == duel.creator || winner == duel.opponent,
        AnturixError::InvalidWinner
    );

    let loser = if winner == duel.creator {
        duel.opponent
    } else {
        duel.creator
    };

    // Validate profiles match winner/loser
    require!(
        ctx.accounts.winner_profile.owner == winner,
        AnturixError::InvalidWinner
    );
    require!(
        ctx.accounts.loser_profile.owner == loser,
        AnturixError::InvalidWinner
    );

    duel.winner = Some(winner);
    duel.status = DuelStatus::Resolved;

    let winner_profile = &mut ctx.accounts.winner_profile;
    winner_profile.banter_wins = winner_profile.banter_wins
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    let loser_profile = &mut ctx.accounts.loser_profile;
    loser_profile.banter_losses = loser_profile.banter_losses
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    let clock = Clock::get()?;
    loser_profile.clown_until = clock.unix_timestamp
        .checked_add(CLOWN_DURATION)
        .ok_or(AnturixError::Overflow)?;

    emit!(DuelResolved {
        duel: duel.key(),
        winner,
        loser,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(winner: Pubkey)]
pub struct ResolveDuel<'info> {
    #[account(
        constraint = admin.key() == ADMIN_PUBKEY @ AnturixError::UnauthorizedAdmin
    )]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub duel_state: Account<'info, DuelState>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, winner_profile.owner.key().as_ref()],
        bump = winner_profile.bump,
    )]
    pub winner_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, loser_profile.owner.key().as_ref()],
        bump = loser_profile.bump,
    )]
    pub loser_profile: Account<'info, UserProfile>,
}
