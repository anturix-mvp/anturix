use anchor_lang::{InstructionData, ToAccountMetas, AccountDeserialize};
pub use litesvm::LiteSVM;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
    instruction::{Instruction, AccountMeta},
    account::Account,
    clock::Clock,
    sysvar,
};

// Re-export anchor Pubkey for comparisons in tests
pub use anchor_lang::prelude::Pubkey as AnchorPubkey;

// ── Pyth constants ──

/// Pyth Receiver program ID (must match pyth.rs)
pub const PYTH_RECEIVER_ID: Pubkey = solana_sdk::pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

/// SOL/USD feed ID
pub const SOL_USD_FEED: [u8; 32] = [
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
    0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
    0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
];

/// BTC/USD feed ID
pub const BTC_USD_FEED: [u8; 32] = [
    0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
    0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
    0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
    0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
];

/// Convert anchor AccountMetas to solana-sdk AccountMetas
fn convert_account_metas(metas: Vec<anchor_lang::prelude::AccountMeta>) -> Vec<AccountMeta> {
    metas.into_iter().map(|m| {
        let pubkey = Pubkey::new_from_array(m.pubkey.to_bytes());
        if m.is_writable {
            if m.is_signer {
                AccountMeta::new(pubkey, true)
            } else {
                AccountMeta::new(pubkey, false)
            }
        } else if m.is_signer {
            AccountMeta::new_readonly(pubkey, true)
        } else {
            AccountMeta::new_readonly(pubkey, false)
        }
    }).collect()
}

/// Build an Instruction from anchor accounts + data, converting types
fn build_ix<T: ToAccountMetas>(
    accounts: T,
    data: Vec<u8>,
) -> Instruction {
    let anchor_metas = accounts.to_account_metas(None);
    Instruction {
        program_id: prog_id(),
        accounts: convert_account_metas(anchor_metas),
        data,
    }
}

pub fn prog_id() -> Pubkey {
    Pubkey::new_from_array(anturix::id().to_bytes())
}

// ── PDA helpers ──

pub fn profile_pda(owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"profile", owner.as_ref()], &prog_id())
}

pub fn duel_pda(creator: &Pubkey, duel_count: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"duel", creator.as_ref(), &duel_count.to_le_bytes()],
        &prog_id(),
    )
}

pub fn escrow_pda(duel_state: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"escrow", duel_state.as_ref()], &prog_id())
}

// ── SVM setup ──

pub fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    let program_bytes = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/anturix.so"));
    let _ = svm.add_program(prog_id(), program_bytes);
    svm
}

pub fn airdrop(svm: &mut LiteSVM, to: &Pubkey, lamports: u64) {
    svm.airdrop(to, lamports).unwrap();
}

pub fn fund_user(svm: &mut LiteSVM, user: &Keypair) {
    airdrop(svm, &user.pubkey(), 10_000_000_000); // 10 SOL
}

// ── Transaction helpers ──

pub fn send_tx(
    svm: &mut LiteSVM,
    ixs: &[Instruction],
    payer: &Keypair,
    signers: &[&Keypair],
) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(ixs, Some(&payer.pubkey()), signers, blockhash);
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}", e))
}

pub fn send_tx_expect_err(
    svm: &mut LiteSVM,
    ixs: &[Instruction],
    payer: &Keypair,
    signers: &[&Keypair],
) -> String {
    send_tx(svm, ixs, payer, signers).expect_err("expected error but tx succeeded")
}

// ── Pubkey conversion ──

fn ap(pk: &Pubkey) -> AnchorPubkey {
    AnchorPubkey::new_from_array(pk.to_bytes())
}

fn sys_id() -> AnchorPubkey {
    AnchorPubkey::new_from_array([0u8; 32])
}

// ── Pyth mock helpers ──

/// Build raw bytes for a PriceUpdateV2 account
pub fn build_mock_price_update(
    feed_id: &[u8; 32],
    price: i64,
    conf: u64,
    exponent: i32,
    publish_time: i64,
) -> Vec<u8> {
    // SHA256("account:PriceUpdateV2")[..8]
    let discriminator: [u8; 8] = [0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd];
    let write_authority = [0u8; 32]; // dummy
    let verification_level: u8 = 1; // Full

    let prev_publish_time = publish_time - 1;
    let ema_price: i64 = price;
    let ema_conf: u64 = conf;
    let posted_slot: u64 = 100;

    let mut data = Vec::with_capacity(128);
    data.extend_from_slice(&discriminator);        // 8
    data.extend_from_slice(&write_authority);       // 32
    data.extend_from_slice(&[verification_level]);  // 1  (offset 40)
    // PriceFeedMessage starts at offset 41
    data.extend_from_slice(feed_id);                // 32
    data.extend_from_slice(&price.to_le_bytes());   // 8
    data.extend_from_slice(&conf.to_le_bytes());    // 8
    data.extend_from_slice(&exponent.to_le_bytes()); // 4
    data.extend_from_slice(&publish_time.to_le_bytes()); // 8
    data.extend_from_slice(&prev_publish_time.to_le_bytes()); // 8
    data.extend_from_slice(&ema_price.to_le_bytes()); // 8
    data.extend_from_slice(&ema_conf.to_le_bytes());  // 8
    data.extend_from_slice(&posted_slot.to_le_bytes()); // 8
    data
}

/// Create a mock Pyth price update account in LiteSVM and return its pubkey
pub fn create_mock_pyth_account(
    svm: &mut LiteSVM,
    feed_id: &[u8; 32],
    price: i64,
    conf: u64,
    exponent: i32,
    publish_time: i64,
) -> Pubkey {
    let data = build_mock_price_update(feed_id, price, conf, exponent, publish_time);
    let key = Keypair::new().pubkey();
    let account = Account {
        lamports: 1_000_000_000, // enough rent
        data,
        owner: PYTH_RECEIVER_ID,
        executable: false,
        rent_epoch: 0,
    };
    svm.set_account(key, account).unwrap();
    key
}

/// Set SVM clock to a specific unix timestamp
pub fn set_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    let clock = Clock {
        slot: 100,
        epoch_start_timestamp: unix_timestamp,
        epoch: 1,
        leader_schedule_epoch: 1,
        unix_timestamp,
    };
    svm.set_sysvar(&clock);
}

// ── Admin keypair ──

pub fn admin_pubkey() -> Pubkey {
    // Must match ADMIN_PUBKEY in constants.rs
    solana_sdk::pubkey!("8RAViABqHQkdSesxZqqFcWnEYnw5baVN2AQB2Z2CmQgX")
}

// ── Instruction builders ──

pub fn ix_init_profile(owner: &Pubkey) -> Instruction {
    let (profile_pda, _) = profile_pda(owner);
    build_ix(
        anturix::accounts::InitProfile {
            owner: ap(owner),
            user_profile: ap(&profile_pda),
            system_program: sys_id(),
        },
        anturix::instruction::InitUserProfile {}.data(),
    )
}

pub fn ix_create_duel(
    creator: &Pubkey,
    duel_count: u64,
    price_feed_id: [u8; 32],
    target_price: i64,
    condition: anturix::state::Condition,
    stake_amount: u64,
    target_opponent: Option<Pubkey>,
    expires_at: i64,
) -> Instruction {
    let (profile, _) = profile_pda(creator);
    let (duel, _) = duel_pda(creator, duel_count);
    let (escrow, _) = escrow_pda(&duel);

    build_ix(
        anturix::accounts::CreateDuel {
            creator: ap(creator),
            creator_profile: ap(&profile),
            duel_state: ap(&duel),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::CreateDuel {
            price_feed_id,
            target_price,
            condition,
            stake_amount,
            target_opponent: target_opponent.map(|p| ap(&p)),
            expires_at,
        }.data(),
    )
}

pub fn ix_accept_duel(opponent: &Pubkey, duel_state: &Pubkey) -> Instruction {
    let (opponent_profile, _) = profile_pda(opponent);
    let (escrow, _) = escrow_pda(duel_state);

    build_ix(
        anturix::accounts::AcceptDuel {
            opponent: ap(opponent),
            opponent_profile: ap(&opponent_profile),
            duel_state: ap(duel_state),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::AcceptDuel {}.data(),
    )
}

pub fn ix_resolve_duel(
    resolver: &Pubkey,
    duel_state: &Pubkey,
    creator: &Pubkey,
    opponent: &Pubkey,
    price_update: &Pubkey,
) -> Instruction {
    let (creator_profile, _) = profile_pda(creator);
    let (opponent_profile, _) = profile_pda(opponent);

    build_ix(
        anturix::accounts::ResolveDuel {
            resolver: ap(resolver),
            duel_state: ap(duel_state),
            price_update: ap(price_update),
            creator_profile: ap(&creator_profile),
            opponent_profile: ap(&opponent_profile),
        },
        anturix::instruction::ResolveDuel {}.data(),
    )
}

pub fn ix_claim_prize(winner: &Pubkey, duel_state: &Pubkey) -> Instruction {
    let (escrow, _) = escrow_pda(duel_state);

    build_ix(
        anturix::accounts::ClaimPrize {
            winner: ap(winner),
            duel_state: ap(duel_state),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::ClaimPrize {}.data(),
    )
}

pub fn ix_cancel_duel(creator: &Pubkey, duel_state: &Pubkey) -> Instruction {
    let (escrow, _) = escrow_pda(duel_state);

    build_ix(
        anturix::accounts::CancelDuel {
            creator: ap(creator),
            duel_state: ap(duel_state),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::CancelDuel {}.data(),
    )
}

pub fn ix_expire_cancel_duel(cranker: &Pubkey, creator: &Pubkey, duel_state: &Pubkey) -> Instruction {
    let (escrow, _) = escrow_pda(duel_state);

    build_ix(
        anturix::accounts::ExpireCancelDuel {
            cranker: ap(cranker),
            creator: ap(creator),
            duel_state: ap(duel_state),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::ExpireCancelDuel {}.data(),
    )
}

pub fn ix_force_cancel_duel(admin: &Pubkey, creator: &Pubkey, opponent: &Pubkey, duel_state: &Pubkey) -> Instruction {
    let (escrow, _) = escrow_pda(duel_state);

    build_ix(
        anturix::accounts::ForceCancelDuel {
            admin: ap(admin),
            creator: ap(creator),
            opponent: ap(opponent),
            duel_state: ap(duel_state),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::ForceCancelDuel {}.data(),
    )
}

// ── Account deserialization ──

pub fn get_account<T: AccountDeserialize>(
    svm: &LiteSVM,
    address: &Pubkey,
) -> T {
    let account = svm.get_account(address).expect("account not found");
    T::try_deserialize(&mut &account.data[..]).expect("failed to deserialize")
}

pub fn to_anchor_pubkey(pk: &Pubkey) -> AnchorPubkey {
    AnchorPubkey::new_from_array(pk.to_bytes())
}

pub fn get_balance(svm: &LiteSVM, address: &Pubkey) -> u64 {
    svm.get_account(address)
        .map(|a| a.lamports)
        .unwrap_or(0)
}

// ── Time helpers ──

pub fn future_ts(seconds_from_now: i64) -> i64 {
    // LiteSVM starts at a fixed clock. Use a large future timestamp.
    1_700_000_000 + seconds_from_now
}

pub fn past_ts() -> i64 {
    1_000_000_000
}

pub fn advance_slot(svm: &mut LiteSVM) {
    svm.expire_blockhash();
}
