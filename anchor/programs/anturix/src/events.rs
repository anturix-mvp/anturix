use anchor_lang::prelude::*;

#[event]
pub struct DuelCreated {
    pub duel: Pubkey,
    pub creator: Pubkey,
    pub price_feed_id: [u8; 32],
    pub target_price: i64,
    pub condition: u8, // 0 = Above, 1 = Below
    pub stake_amount: u64,
    pub target_opponent: Option<Pubkey>,
    pub expires_at: i64,
}

#[event]
pub struct DuelAccepted {
    pub duel: Pubkey,
    pub opponent: Pubkey,
}

#[event]
pub struct DuelResolved {
    pub duel: Pubkey,
    pub winner: Pubkey,
    pub loser: Pubkey,
    pub oracle_price: i64,
    pub oracle_exponent: i32,
}

#[event]
pub struct PrizeClaimed {
    pub duel: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DuelCancelled {
    pub duel: Pubkey,
    pub reason: String,
}
