use anchor_lang::prelude::*;

use crate::state::Side;

#[account]
pub struct PositionTicket {
    pub duel: Pubkey,
    pub owner: Pubkey,
    pub side: Side,
    pub amount: u64,
    pub locked_odds_bps: u64,
    pub potential_payout: u64,
    pub claimed: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl PositionTicket {
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 1 + 8 + 1;
}
