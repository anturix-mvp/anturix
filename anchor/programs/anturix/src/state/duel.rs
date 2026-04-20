use anchor_lang::prelude::*;

#[account]
pub struct DuelState {
    pub creator: Pubkey,              // 32
    pub opponent: Pubkey,             // 32 — default = public pool, set = targeted/accepted
    pub price_feed_id: [u8; 32],      // 32 — Pyth price feed ID (asset A)
    pub target_price: i64,            // 8  — target price (Above/Below)
    pub condition: Condition,         // 1  — bet type
    pub stake_amount: u64,            // 8 — Initial stake for 1v1, or total stake for pool
    pub status: DuelStatus,           // 1
    pub winner: Option<Pubkey>,       // 1 + 32 = 33
    pub expires_at: i64,              // 8  — settlement allowed after this timestamp
    pub bump: u8,                     // 1
    pub escrow_bump: u8,              // 1
    pub lower_bound: i64,             // 8 
    pub upper_bound: i64,             // 8 
    pub price_feed_id_b: [u8; 32],    // 32
    pub start_price_a: i64,           // 8 
    pub start_price_b: i64,           // 8 
    pub mode: DuelMode,               // 1
    pub creator_side: Side,           // 1
    pub winning_side: Side,           // 1
    pub pool_up_total: u64,           // 8
    pub pool_down_total: u64,         // 8
    pub locked_payout_up_total: u64,  // 8
    pub locked_payout_down_total: u64,// 8
    pub next_ticket_id: u64,          // 8
}

impl DuelState {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1 + 8 + 1 + (1 + 32) + 8 + 1 + 1 + 8 + 8 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 8 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DuelMode {
    Private1v1,
    PublicArena,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Side {
    Up,
    Down,
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DuelStatus {
    Pending,
    Active,
    Resolved,
    Cancelled,
    Claimed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Condition {
    Above,      // creator wins if price > target_price
    Below,      // creator wins if price < target_price
    Odd,        // creator wins if last digit of price is odd
    Even,       // creator wins if last digit of price is even
    InRange,    // creator wins if lower_bound <= price <= upper_bound
    OutOfRange, // creator wins if price < lower_bound OR price > upper_bound
    AssetRace,  // creator wins if asset A outperforms asset B (% gain)
}
