use anchor_lang::prelude::*;

#[event]
pub struct DuelCreated {
    pub duel: Pubkey,
    pub creator: Pubkey,
    pub event_id: String,
    pub stake_amount: u64,
    pub prediction: String,
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

#[event]
pub struct ExpertLockCreated {
    pub lock: Pubkey,
    pub expert: Pubkey,
    pub event_id: String,
    pub fee: u64,
    pub expires_at: i64,
}

#[event]
pub struct ExpertLockPurchased {
    pub lock: Pubkey,
    pub buyer: Pubkey,
    pub fee: u64,
}

#[event]
pub struct ExpertLockRevealed {
    pub lock: Pubkey,
    pub prediction: String,
}

#[event]
pub struct ExpertLockResolved {
    pub lock: Pubkey,
    pub correct: bool,
}

#[event]
pub struct PokerPoolCreated {
    pub pool: Pubkey,
    pub creator: Pubkey,
    pub buy_in: u64,
}

#[event]
pub struct PlayerJoined {
    pub pool: Pubkey,
    pub player: Pubkey,
    pub seat: u8,
}

#[event]
pub struct PlayerLeft {
    pub pool: Pubkey,
    pub player: Pubkey,
}
