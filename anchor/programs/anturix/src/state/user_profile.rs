use anchor_lang::prelude::*;

#[account]
pub struct UserProfile {
    pub owner: Pubkey,    // 32
    pub wins: u32,        // 4
    pub losses: u32,      // 4
    pub clown_until: i64, // 8
    pub duel_count: u64,  // 8
    pub bump: u8,         // 1
}

impl UserProfile {
    pub const SIZE: usize = 8 + 32 + 4 + 4 + 8 + 8 + 1; // 65
}
