#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod pyth;
pub mod state;

use instructions::*;
use state::Condition;

declare_id!("DBUe2tdR9esX7WxfPgTU9NTiUpB7anLkAnjocVukSEAZ");

#[program]
pub mod anturix {
    use super::*;

    pub fn init_user_profile(ctx: Context<InitProfile>) -> Result<()> {
        instructions::init_profile::handler(ctx)
    }

    pub fn create_duel(
        ctx: Context<CreateDuel>,
        price_feed_id: [u8; 32],
        target_price: i64,
        condition: Condition,
        stake_amount: u64,
        target_opponent: Option<Pubkey>,
        expires_at: i64,
        lower_bound: i64,
        upper_bound: i64,
        price_feed_id_b: [u8; 32],
        mode: state::DuelMode,
        creator_side: state::Side,
    ) -> Result<()> {
        instructions::create_duel::handler(
            ctx,
            price_feed_id,
            target_price,
            condition,
            stake_amount,
            target_opponent,
            expires_at,
            lower_bound,
            upper_bound,
            price_feed_id_b,
            mode,
            creator_side,
        )
    }


    pub fn accept_duel(
        ctx: Context<AcceptDuel>,
        side: state::Side,
        amount: u64,
    ) -> Result<()> {
        instructions::accept_duel::handler(ctx, side, amount)
    }


    pub fn resolve_duel(ctx: Context<ResolveDuel>) -> Result<()> {
        instructions::resolve_duel::handler(ctx)
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
    }

    pub fn claim_ticket(ctx: Context<ClaimTicket>) -> Result<()> {
        instructions::claim_ticket::handler(ctx)
    }

    pub fn cancel_duel(ctx: Context<CancelDuel>) -> Result<()> {
        instructions::cancel_duel::handler(ctx)
    }

    pub fn expire_cancel_duel(ctx: Context<ExpireCancelDuel>) -> Result<()> {
        instructions::expire_cancel_duel::handler(ctx)
    }

    pub fn force_cancel_duel(ctx: Context<ForceCancelDuel>) -> Result<()> {
        instructions::force_cancel_duel::handler(ctx)
    }
}
