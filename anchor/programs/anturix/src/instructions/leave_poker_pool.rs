use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PokerPool, PoolStatus};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::PlayerLeft;

pub fn handler(ctx: Context<LeavePokerPool>) -> Result<()> {
    let pool = &mut ctx.accounts.poker_pool;
    let player_key = ctx.accounts.player.key();

    require!(pool.status == PoolStatus::Open, AnturixError::InvalidPoolStatus);

    // Find player in array
    let mut found_index: Option<usize> = None;
    for i in 0..pool.player_count as usize {
        if pool.players[i] == player_key {
            found_index = Some(i);
            break;
        }
    }
    let index = found_index.ok_or(AnturixError::PlayerNotInPool)?;

    pool.player_count -= 1;

    let pool_key = pool.key();
    let escrow_seeds: &[&[u8]] = &[
        SEED_POKER_ESCROW,
        pool_key.as_ref(),
        &[pool.escrow_bump],
    ];

    if pool.player_count == 0 {
        // Last player — drain ALL escrow (buy_in + any rent dust)
        let amount = ctx.accounts.escrow.lamports();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[escrow_seeds],
            ),
            amount,
        )?;
        pool.status = PoolStatus::Closed;
    } else {
        // Refund buy_in
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[escrow_seeds],
            ),
            pool.buy_in,
        )?;
    }

    // Swap-remove: move last player to vacated slot
    let last = pool.player_count as usize;
    if index < last {
        pool.players[index] = pool.players[last];
    }
    pool.players[last] = Pubkey::default();

    emit!(PlayerLeft {
        pool: pool.key(),
        player: player_key,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct LeavePokerPool<'info> {
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
