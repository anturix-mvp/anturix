use anchor_lang::prelude::*;

#[account]
pub struct UserProfile {
    pub owner: Pubkey,          // 32
    pub banter_wins: u32,       // 4
    pub banter_losses: u32,     // 4
    pub total_predictions: u32, // 4
    pub correct_predictions: u32, // 4
    pub clown_until: i64,       // 8
    pub duel_count: u64,        // 8
    pub pool_count: u64,        // 8
    pub bump: u8,               // 1
}

impl UserProfile {
    pub const SIZE: usize = 8 + 32 + 4 + 4 + 4 + 4 + 8 + 8 + 8 + 1; // 81
}
