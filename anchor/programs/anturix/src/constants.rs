use anchor_lang::prelude::*;

pub const ADMIN_PUBKEY: Pubkey = pubkey!("8RAViABqHQkdSesxZqqFcWnEYnw5baVN2AQB2Z2CmQgX");

pub const MIN_CREATE_STAKE: u64 = 20_000_000; // 0.02 SOL — anti-spam floor
pub const MIN_JOIN_STAKE: u64 = 10_000_000;   // 0.01 SOL — lower bar for joiners
pub const MAXIMUM_PRICE_AGE: u64 = 30;         // seconds — Pyth staleness threshold
pub const MIN_EXPIRY_DURATION: i64 = 60;       // minimum 60 seconds before expiry

pub const SEED_PROFILE: &[u8] = b"profile";
pub const SEED_DUEL: &[u8] = b"duel";
pub const SEED_ESCROW: &[u8] = b"escrow";
pub const SEED_POSITION: &[u8] = b"position";
