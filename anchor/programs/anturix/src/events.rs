use anchor_lang::prelude::*;

#[event]
pub struct DuelCreated {
    pub duel: Pubkey,
    pub creator: Pubkey,
    pub visibility: u8,        // 0 = Private, 1 = Public
    pub creator_side: u8,      // 0 = OptionA, 1 = OptionB
    pub condition: u8,
    pub price_feed_id: [u8; 32],
    pub price_feed_id_b: [u8; 32],
    pub target_price: i64,
    pub lower_bound: i64,
    pub upper_bound: i64,
    pub stake_amount: u64,
    pub expires_at: i64,
}

#[event]
pub struct PoolJoined {
    pub duel: Pubkey,
    pub owner: Pubkey,
    pub side: u8,
    pub amount: u64,
    pub new_position_stake: u64,
    pub side_a_total: u64,
    pub side_b_total: u64,
}

#[event]
pub struct DuelResolved {
    pub duel: Pubkey,
    pub winner_side: u8,
    pub oracle_price: i64,
    pub oracle_exponent: i32,
}

#[event]
pub struct DuelCancelled {
    pub duel: Pubkey,
    pub reason: String, // "orphan" | "creator" | "force"
}

#[event]
pub struct ShareClaimed {
    pub duel: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RefundClaimed {
    pub duel: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}
