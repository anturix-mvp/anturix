use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PokerPool, PoolStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::PlayerJoined;

pub fn handler(ctx: Context<JoinPokerPool>) -> Result<()> {
    let pool = &mut ctx.accounts.poker_pool;
    let player_key = ctx.accounts.player.key();

    require!(pool.status == PoolStatus::Open, AnturixError::InvalidPoolStatus);
    require!((pool.player_count as usize) < MAX_POKER_PLAYERS, AnturixError::PoolFull);

    // Check not already in pool
    for i in 0..pool.player_count as usize {
        require!(pool.players[i] != player_key, AnturixError::AlreadyInPool);
    }

    // Transfer buy-in
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        pool.buy_in,
    )?;

    let seat = pool.player_count;
    pool.players[seat as usize] = player_key;
    pool.player_count = seat + 1;

    if pool.player_count as usize == MAX_POKER_PLAYERS {
        pool.status = PoolStatus::Full;
    }

    emit!(PlayerJoined {
        pool: pool.key(),
        player: player_key,
        seat,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct JoinPokerPool<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub poker_pool: Account<'info, PokerPool>,

    /// CHECK: poker escrow PDA
    #[account(
        mut,
        seeds = [SEED_POKER_ESCROW, poker_pool.key().as_ref()],
        bump = poker_pool.escrow_bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
