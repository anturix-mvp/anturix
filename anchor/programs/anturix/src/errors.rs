use anchor_lang::prelude::*;

#[error_code]
pub enum AnturixError {
    #[msg("Stake below minimum")]
    StakeTooLow,
    #[msg("Duel not in expected status")]
    InvalidDuelStatus,
    #[msg("Duel has expired")]
    DuelExpired,
    #[msg("Duel has not expired yet")]
    DuelNotExpired,
    #[msg("Private duel requires exact stake match")]
    ExactStakeRequired,
    #[msg("Private duel already has an opponent")]
    PrivateAlreadyMatched,
    #[msg("Wrong side for this mode")]
    WrongSide,
    #[msg("Cannot bet against yourself")]
    SelfDuel,
    #[msg("Unauthorized — not admin")]
    UnauthorizedAdmin,
    #[msg("Caller is not on the winning side")]
    NotOnWinningSide,
    #[msg("Position already claimed")]
    AlreadyClaimed,
    #[msg("Opposite side has liquidity, cannot cancel")]
    OppositeSideNotEmpty,
    #[msg("Expiry must be in the future and at least 60 seconds out")]
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
    #[msg("Winning side has zero liquidity")]
    NoWinningLiquidity,
    #[msg("Price must be published at or after duel expiry")]
    PriceBeforeExpiry,
    #[msg("Price feed ID cannot be zero")]
    InvalidFeedId,
}
