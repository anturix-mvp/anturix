use anchor_lang::prelude::*;

#[error_code]
pub enum AnturixError {
    #[msg("Stake below minimum (0.01 SOL)")]
    StakeTooLow,
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
    #[msg("Not the winner")]
    NotWinner,
    #[msg("Expiry must be in the future")]
    InvalidExpiry,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Price feed ID does not match expected feed")]
    InvalidPriceFeed,
    #[msg("Price update is too stale")]
    PriceTooStale,
    #[msg("Invalid Pyth price account (wrong owner or data)")]
    InvalidPriceAccount,
    #[msg("Target price must be positive")]
    InvalidTargetPrice,
    #[msg("Oracle confidence interval too wide (>5%), price unreliable")]
    PriceConfidenceTooWide,
    #[msg("Lower bound must be positive and less than upper bound")]
    InvalidBounds,
    #[msg("Second price feed required for AssetRace")]
    InvalidSecondFeed,
    #[msg("Missing required price update account in remaining_accounts")]
    MissingPriceAccount,
    #[msg("Staked amount does not match the required amount for this duel")]
    WrongStakeAmount,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Insufficient arena liquidity for requested odds")]
    InsufficientLiquidity,
    #[msg("Ticket already claimed")]
    TicketAlreadyClaimed,
    #[msg("Ticket does not belong to this duel")]
    InvalidTicket,
}

