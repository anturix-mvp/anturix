use anchor_lang::prelude::*;

#[account]
pub struct DuelState {
    pub creator: Pubkey,              // 32
    pub opponent: Pubkey,             // 32 — default = public pool, set = targeted/accepted
    pub price_feed_id: [u8; 32],      // 32 — Pyth price feed ID
    pub target_price: i64,            // 8  — target price in Pyth native format
    pub condition: Condition,         // 1  — Above or Below
    pub stake_amount: u64,            // 8
    pub status: DuelStatus,           // 1
    pub winner: Option<Pubkey>,       // 1 + 32 = 33
    pub expires_at: i64,              // 8  — settlement allowed after this timestamp
    pub bump: u8,                     // 1
    pub escrow_bump: u8,              // 1
}

impl DuelState {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1 + 8 + 1 + (1 + 32) + 8 + 1 + 1; // 165
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DuelStatus {
    Pending,
    Active,
    Resolved,
    Cancelled,
    Claimed,
}

/// Creator bets the condition is true, opponent bets it is false.
/// Strict inequality: price == target_price means opponent wins.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Condition {
    Above, // creator wins if oracle price > target_price
    Below, // creator wins if oracle price < target_price
}
