use anchor_lang::prelude::*;

#[account]
pub struct DuelState {
    pub creator: Pubkey,              // 32
    pub opponent: Pubkey,             // 32 — default = public pool, set = targeted/accepted
    pub event_id: String,             // 4 + 64 = 68
    pub stake_amount: u64,            // 8
    pub status: DuelStatus,           // 1
    pub winner: Option<Pubkey>,       // 1 + 32 = 33
    pub expires_at: i64,              // 8
    pub bump: u8,                     // 1
    pub escrow_bump: u8,              // 1
}

impl DuelState {
    pub const SIZE: usize = 8 + 32 + 32 + (4 + 64) + 8 + 1 + (1 + 32) + 8 + 1 + 1; // 192
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DuelStatus {
    Pending,
    Active,
    Resolved,
    Cancelled,
    Claimed,
}
