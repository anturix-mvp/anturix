use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{UserProfile, PokerPool, PoolStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::PokerPoolCreated;

pub fn handler(ctx: Context<CreatePokerPool>, buy_in: u64) -> Result<()> {
    require!(buy_in > 0, AnturixError::InvalidBuyIn);

    let creator_profile = &mut ctx.accounts.creator_profile;
    let pool = &mut ctx.accounts.poker_pool;

    pool.creator = ctx.accounts.creator.key();
    pool.buy_in = buy_in;
    pool.players = [Pubkey::default(); 6];
    pool.players[0] = ctx.accounts.creator.key();
    pool.player_count = 1;
    pool.status = PoolStatus::Open;
    pool.bump = ctx.bumps.poker_pool;
    pool.escrow_bump = ctx.bumps.escrow;

    // Transfer buy-in to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        buy_in,
    )?;

    creator_profile.pool_count = creator_profile.pool_count
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    emit!(PokerPoolCreated {
        pool: pool.key(),
        creator: ctx.accounts.creator.key(),
        buy_in,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreatePokerPool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, creator.key().as_ref()],
        bump = creator_profile.bump,
    )]
    pub creator_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = creator,
        space = PokerPool::SIZE,
        seeds = [SEED_POKER, creator.key().as_ref(), &creator_profile.pool_count.to_le_bytes()],
        bump,
    )]
    pub poker_pool: Account<'info, PokerPool>,

    /// CHECK: poker escrow PDA — system-owned, holds buy-ins
    #[account(
        mut,
        seeds = [SEED_POKER_ESCROW, poker_pool.key().as_ref()],
        bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
