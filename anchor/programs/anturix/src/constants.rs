use anchor_lang::prelude::*;

pub const ADMIN_PUBKEY: Pubkey = pubkey!("8RAViABqHQkdSesxZqqFcWnEYnw5baVN2AQB2Z2CmQgX");

pub const MIN_STAKE: u64 = 10_000_000; // 0.01 SOL
pub const CLOWN_DURATION: i64 = 86_400; // 24 hours
pub const MAXIMUM_PRICE_AGE: u64 = 30; // seconds — Pyth staleness threshold
pub const MIN_EXPIRY_DURATION: i64 = 60; // minimum 60 seconds before expiry

pub const SEED_PROFILE: &[u8] = b"profile";
pub const SEED_DUEL: &[u8] = b"duel";
pub const SEED_ESCROW: &[u8] = b"escrow";
pub const SEED_TICKET: &[u8] = b"ticket";

pub const ODDS_SCALE_BPS: u64 = 10_000;
pub const MIN_LOCKED_ODDS_BPS: u64 = 10_100; // 1.01x minimum
pub const MAX_LOCKED_ODDS_BPS: u64 = 100_000; // 10.0x maximum
pub const DEFAULT_START_ODDS_BPS: u64 = 20_000; // 2.0x
