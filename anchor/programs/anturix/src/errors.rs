use anchor_lang::prelude::*;

#[error_code]
pub enum AnturixError {
    #[msg("Stake below minimum (0.01 SOL)")]
    StakeTooLow,
    #[msg("Event ID exceeds 64 chars")]
    EventIdTooLong,
    #[msg("Prediction exceeds 280 chars")]
    PredictionTooLong,
    #[msg("Duel not in expected status")]
    InvalidDuelStatus,
    #[msg("Duel has expired")]
    DuelExpired,
    #[msg("Duel has not expired yet")]
    DuelNotExpired,
    #[msg("Not the target opponent for this duel")]
    WrongOpponent,
    #[msg("Cannot duel yourself")]
    SelfDuel,
    #[msg("Unauthorized — not admin")]
    UnauthorizedAdmin,
    #[msg("Winner must be creator or opponent")]
    InvalidWinner,
    #[msg("Not the winner")]
    NotWinner,
    #[msg("Need 3+ banter wins to create expert lock")]
    InsufficientBanterWins,
    #[msg("Prediction hash mismatch on reveal")]
    HashMismatch,
    #[msg("Fee must be greater than zero")]
    InvalidFee,
    #[msg("Expert lock expired")]
    ExpertLockExpired,
    #[msg("Expert lock not in expected status")]
    InvalidExpertLockStatus,
    #[msg("Poker pool is full")]
    PoolFull,
    #[msg("Already in this pool")]
    AlreadyInPool,
    #[msg("Not in this pool")]
    PlayerNotInPool,
    #[msg("Pool not in expected status")]
    InvalidPoolStatus,
    #[msg("Buy-in must be greater than zero")]
    InvalidBuyIn,
    #[msg("Expiry must be in the future")]
    InvalidExpiry,
    #[msg("Arithmetic overflow")]
    Overflow,
}
