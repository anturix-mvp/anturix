use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{UserProfile, DuelState, DuelStatus, Position, Side};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::ShareClaimed;

pub fn handler(ctx: Context<ClaimShare>, side: Side) -> Result<()> {
    let duel = &ctx.accounts.duel_state;

    require!(duel.status == DuelStatus::Resolved, AnturixError::InvalidDuelStatus);

    let winner_side = duel.winner_side.ok_or(AnturixError::InvalidDuelStatus)?;
    require!(side == winner_side, AnturixError::NotOnWinningSide);

    let winning_total = match winner_side {
        Side::OptionA => duel.side_a_total,
        Side::OptionB => duel.side_b_total,
    };
    require!(winning_total > 0, AnturixError::NoWinningLiquidity);

    let total_pot = duel.side_a_total
        .checked_add(duel.side_b_total)
        .ok_or(AnturixError::Overflow)?;

    let position = &ctx.accounts.position;
    let share_u128 = (total_pot as u128)
        .checked_mul(position.stake as u128)
        .ok_or(AnturixError::Overflow)?
        .checked_div(winning_total as u128)
        .ok_or(AnturixError::Overflow)?;
    let share: u64 = share_u128.try_into().map_err(|_| AnturixError::Overflow)?;

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
        share,
    )?;

    let profile = &mut ctx.accounts.owner_profile;
    profile.wins = profile.wins.checked_add(1).ok_or(AnturixError::Overflow)?;

    emit!(ShareClaimed {
        duel: duel_key,
        owner: ctx.accounts.owner.key(),
        amount: share,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(side: Side)]
pub struct ClaimShare<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, owner.key().as_ref()],
        bump = owner_profile.bump,
    )]
    pub owner_profile: Account<'info, UserProfile>,

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
        constraint = position.owner == owner.key() @ AnturixError::NotOnWinningSide,
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
