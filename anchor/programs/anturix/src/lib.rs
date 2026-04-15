#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HiErQ1fFikbgqEMjDD58trMaZ8XHGtSmztEJu31UZA9");

#[program]
pub mod anturix {
    use super::*;

    // === Feature A: Smart Banter ===

    pub fn init_user_profile(ctx: Context<InitProfile>) -> Result<()> {
        instructions::init_profile::handler(ctx)
    }

    pub fn create_duel(
        ctx: Context<CreateDuel>,
        event_id: String,
        prediction: String,
        stake_amount: u64,
        target_opponent: Option<Pubkey>,
        expires_at: i64,
    ) -> Result<()> {
        instructions::create_duel::handler(ctx, event_id, prediction, stake_amount, target_opponent, expires_at)
    }

    pub fn accept_duel(ctx: Context<AcceptDuel>) -> Result<()> {
        instructions::accept_duel::handler(ctx)
    }

    pub fn resolve_duel(ctx: Context<ResolveDuel>, winner: Pubkey) -> Result<()> {
        instructions::resolve_duel::handler(ctx, winner)
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
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

    // === Feature B: Expert Lock ===

    pub fn create_expert_lock(
        ctx: Context<CreateExpertLock>,
        prediction_hash: [u8; 32],
        fee: u64,
        event_id: String,
        expires_at: i64,
    ) -> Result<()> {
        instructions::create_expert_lock::handler(ctx, prediction_hash, fee, event_id, expires_at)
    }

    pub fn buy_expert_lock(ctx: Context<BuyExpertLock>) -> Result<()> {
        instructions::buy_expert_lock::handler(ctx)
    }

    pub fn reveal_expert_lock(
        ctx: Context<RevealExpertLock>,
        prediction: String,
        salt: [u8; 16],
    ) -> Result<()> {
        instructions::reveal_expert_lock::handler(ctx, prediction, salt)
    }

    pub fn resolve_expert_lock(ctx: Context<ResolveExpertLock>, correct: bool) -> Result<()> {
        instructions::resolve_expert_lock::handler(ctx, correct)
    }

    // === Feature C: Poker Pool ===

    pub fn create_poker_pool(ctx: Context<CreatePokerPool>, buy_in: u64) -> Result<()> {
        instructions::create_poker_pool::handler(ctx, buy_in)
    }

    pub fn join_poker_pool(ctx: Context<JoinPokerPool>) -> Result<()> {
        instructions::join_poker_pool::handler(ctx)
    }

    pub fn leave_poker_pool(ctx: Context<LeavePokerPool>) -> Result<()> {
        instructions::leave_poker_pool::handler(ctx)
    }

    pub fn close_poker_pool<'a>(ctx: Context<'a, ClosePokerPool<'a>>) -> Result<()> {
        instructions::close_poker_pool::handler(ctx)
    }
}
