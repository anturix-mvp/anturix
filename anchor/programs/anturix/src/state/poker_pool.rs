use anchor_lang::prelude::*;

#[account]
pub struct PokerPool {
    pub creator: Pubkey,       // 32
    pub buy_in: u64,           // 8
    pub players: [Pubkey; 6],  // 192
    pub player_count: u8,      // 1
    pub status: PoolStatus,    // 1
    pub bump: u8,              // 1
    pub escrow_bump: u8,       // 1
}

impl PokerPool {
    pub const SIZE: usize = 8 + 32 + 8 + (32 * 6) + 1 + 1 + 1 + 1; // 244
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PoolStatus {
    Open,
    Full,
    Closed,
}
