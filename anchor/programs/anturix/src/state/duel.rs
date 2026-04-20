use anchor_lang::prelude::*;

#[account]
pub struct DuelState {
    pub creator: Pubkey,              // 32
    pub visibility: Visibility,       // 1
    pub condition: Condition,         // 1
    pub price_feed_id: [u8; 32],      // 32 — Pyth feed (asset A)
    pub price_feed_id_b: [u8; 32],    // 32 — Pyth feed (AssetRace only)
    pub target_price: i64,            // 8  — Above/Below threshold
    pub lower_bound: i64,             // 8  — InRange/OutOfRange lower
    pub upper_bound: i64,             // 8  — InRange/OutOfRange upper
    pub start_price_a: i64,           // 8  — AssetRace baseline A
    pub start_price_b: i64,           // 8  — AssetRace baseline B
    pub creator_side: Side,           // 1
    pub creator_stake: u64,           // 8  — Private: required match amount
    pub side_a_total: u64,            // 8
    pub side_b_total: u64,            // 8
    pub status: DuelStatus,           // 1
    pub winner_side: Option<Side>,    // 1 + 1 = 2
    pub oracle_price: i64,            // 8  — settlement price snapshot
    pub expires_at: i64,              // 8
    pub bump: u8,                     // 1
    pub escrow_bump: u8,              // 1
}

impl DuelState {
    pub const SIZE: usize = 8 + 32 + 1 + 1 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 1 + 2 + 8 + 8 + 1 + 1; // 200
}

#[account]
pub struct Position {
    pub duel: Pubkey,   // 32
    pub owner: Pubkey,  // 32
    pub side: Side,     // 1
    pub stake: u64,     // 8  — cumulative
    pub bump: u8,       // 1
}

impl Position {
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 8 + 1; // 82
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Visibility {
    Private,
    Public,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Side {
    OptionA,
    OptionB,
}

impl Side {
    pub fn as_byte(&self) -> u8 {
        match self {
            Side::OptionA => 0,
            Side::OptionB => 1,
        }
    }

    pub fn opposite(&self) -> Side {
        match self {
            Side::OptionA => Side::OptionB,
            Side::OptionB => Side::OptionA,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DuelStatus {
    Open,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Condition {
    Above,      // OPTION_A wins if price > target_price
    Below,      // OPTION_A wins if price < target_price
    Odd,        // OPTION_A wins if last digit of price is odd
    Even,       // OPTION_A wins if last digit of price is even
    InRange,    // OPTION_A wins if lower_bound <= price <= upper_bound
    OutOfRange, // OPTION_A wins if price < lower_bound OR price > upper_bound
    AssetRace,  // OPTION_A wins if asset A outperforms asset B (% gain)
}
