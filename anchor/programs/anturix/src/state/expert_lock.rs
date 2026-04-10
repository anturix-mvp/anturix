use anchor_lang::prelude::*;

#[account]
pub struct ExpertLockState {
    pub expert: Pubkey,               // 32
    pub event_id: String,             // 4 + 64 = 68
    pub prediction_hash: [u8; 32],    // 32
    pub fee: u64,                     // 8
    pub status: ExpertLockStatus,     // 1
    pub result_correct: Option<bool>, // 1 + 1 = 2
    pub expires_at: i64,              // 8
    pub bump: u8,                     // 1
}

impl ExpertLockState {
    pub const SIZE: usize = 8 + 32 + (4 + 64) + 32 + 8 + 1 + 2 + 8 + 1; // 160
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExpertLockStatus {
    Active,
    Revealed,
    Resolved,
}
