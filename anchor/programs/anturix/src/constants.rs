use anchor_lang::prelude::*;

pub const ADMIN_PUBKEY: Pubkey = pubkey!("8RAViABqHQkdSesxZqqFcWnEYnw5baVN2AQB2Z2CmQgX");

pub const MAX_EVENT_ID_LEN: usize = 64;
pub const MAX_PREDICTION_LEN: usize = 280;
pub const MIN_BANTER_WINS_FOR_EXPERT: u32 = 3;
pub const MAX_POKER_PLAYERS: usize = 6;
pub const MIN_STAKE: u64 = 10_000_000; // 0.01 SOL
pub const CLOWN_DURATION: i64 = 86_400; // 24 hours

pub const SEED_PROFILE: &[u8] = b"profile";
pub const SEED_DUEL: &[u8] = b"duel";
pub const SEED_ESCROW: &[u8] = b"escrow";
pub const SEED_EXPERT_LOCK: &[u8] = b"expert_lock";
pub const SEED_POKER: &[u8] = b"poker";
pub const SEED_POKER_ESCROW: &[u8] = b"poker_escrow";
