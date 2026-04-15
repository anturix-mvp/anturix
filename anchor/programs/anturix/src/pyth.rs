use anchor_lang::prelude::*;
use crate::constants::MAXIMUM_PRICE_AGE;
use crate::errors::AnturixError;

/// Pyth Receiver program ID (same on mainnet and devnet)
pub const PYTH_RECEIVER_ID: Pubkey = pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

/// SHA256("account:PriceUpdateV2")[..8]
const PRICE_UPDATE_V2_DISCRIMINATOR: [u8; 8] = [0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd];

/// Byte offsets in PriceUpdateV2 account data
const OFFSET_DISCRIMINATOR: usize = 0;
const OFFSET_VERIFICATION_LEVEL: usize = 40; // 8 (disc) + 32 (write_authority)
const OFFSET_PRICE_MESSAGE: usize = 41; // verification_level Full = single byte

/// Parsed Pyth price data
pub struct PythPrice {
    pub price: i64,
    pub conf: u64,
    pub exponent: i32,
}

/// Parse and validate a Pyth PriceUpdateV2 account without the SDK.
///
/// Validates: owner, discriminator, verification level (Full), feed ID match,
/// staleness, and positive price.
pub fn parse_price_update(
    account: &AccountInfo,
    expected_feed_id: &[u8; 32],
    clock: &Clock,
) -> Result<PythPrice> {
    // 1. Verify owner is Pyth Receiver program
    require!(
        *account.owner == PYTH_RECEIVER_ID,
        AnturixError::InvalidPriceAccount
    );

    let data = account.try_borrow_data()?;

    // Minimum size: disc(8) + write_auth(32) + verify_level(1) + feed_id(32) +
    //   price(8) + conf(8) + exponent(4) + publish_time(8) = 101
    require!(data.len() >= 101, AnturixError::InvalidPriceAccount);

    // 2. Verify discriminator
    require!(
        data[OFFSET_DISCRIMINATOR..OFFSET_DISCRIMINATOR + 8] == PRICE_UPDATE_V2_DISCRIMINATOR,
        AnturixError::InvalidPriceAccount
    );

    // 3. Verify Full verification (variant index 1)
    require!(
        data[OFFSET_VERIFICATION_LEVEL] == 1,
        AnturixError::InvalidPriceAccount
    );

    // 4. Parse PriceFeedMessage fields starting at offset 41
    let offset = OFFSET_PRICE_MESSAGE;

    let feed_id: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| error!(AnturixError::InvalidPriceAccount))?;

    let price = i64::from_le_bytes(
        data[offset + 32..offset + 40]
            .try_into()
            .map_err(|_| error!(AnturixError::InvalidPriceAccount))?,
    );

    let conf = u64::from_le_bytes(
        data[offset + 40..offset + 48]
            .try_into()
            .map_err(|_| error!(AnturixError::InvalidPriceAccount))?,
    );

    let exponent = i32::from_le_bytes(
        data[offset + 48..offset + 52]
            .try_into()
            .map_err(|_| error!(AnturixError::InvalidPriceAccount))?,
    );

    let publish_time = i64::from_le_bytes(
        data[offset + 52..offset + 60]
            .try_into()
            .map_err(|_| error!(AnturixError::InvalidPriceAccount))?,
    );

    // 5. Verify feed ID matches
    require!(feed_id == *expected_feed_id, AnturixError::InvalidPriceFeed);

    // 6. Verify staleness
    let max_age = MAXIMUM_PRICE_AGE as i64;
    require!(
        publish_time.checked_add(max_age).unwrap_or(i64::MAX) >= clock.unix_timestamp,
        AnturixError::PriceTooStale
    );

    // 7. Verify positive price
    require!(price > 0, AnturixError::InvalidPriceAccount);

    // 8. Verify confidence interval is not too wide (max 5% of price)
    // Prevents resolution during extreme volatility when outcome is unreliable
    let price_u64 = price as u64;
    let max_conf = price_u64 / 20; // 5%
    require!(conf <= max_conf, AnturixError::PriceConfidenceTooWide);

    Ok(PythPrice {
        price,
        conf,
        exponent,
    })
}
