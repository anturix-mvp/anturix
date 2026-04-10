use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PokerPool, PoolStatus};
use crate::constants::*;
use crate::errors::AnturixError;

pub fn handler<'a>(ctx: Context<'a, ClosePokerPool<'a>>) -> Result<()> {
    let pool = &ctx.accounts.poker_pool;

    require!(
        pool.status == PoolStatus::Closed || pool.status == PoolStatus::Full,
        AnturixError::InvalidPoolStatus
    );

    if pool.status == PoolStatus::Full {
        // Refund each player their buy_in from escrow
        let pool_key = pool.key();
        let escrow_seeds: &[&[u8]] = &[
            SEED_POKER_ESCROW,
            pool_key.as_ref(),
            &[pool.escrow_bump],
        ];

        // We need remaining_accounts for the 6 players
        let players = pool.players;
        let buy_in = pool.buy_in;

        for i in 0..pool.player_count as usize {
            let player_info = &ctx.remaining_accounts[i];
            require!(
                player_info.key() == players[i],
                AnturixError::InvalidPoolStatus
            );

            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: player_info.clone(),
                    },
                    &[escrow_seeds],
                ),
                buy_in,
            )?;
        }

        // Any dust (rent) goes to creator
        let remaining = ctx.accounts.escrow.lamports();
        if remaining > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                    &[escrow_seeds],
                ),
                remaining,
            )?;
        }
    }

    // Closed pools have empty escrow (last leaver drained it)
    // Just close the pool account — rent goes to creator via Anchor close
    Ok(())
}

#[derive(Accounts)]
pub struct ClosePokerPool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        close = creator,
        constraint = poker_pool.creator == creator.key() @ AnturixError::InvalidPoolStatus,
    )]
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
