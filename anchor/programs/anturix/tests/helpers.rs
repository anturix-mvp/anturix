use anchor_lang::{InstructionData, ToAccountMetas, AccountDeserialize};
pub use litesvm::LiteSVM;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
    instruction::{Instruction, AccountMeta},
};

// Re-export anchor Pubkey for comparisons in tests
pub use anchor_lang::prelude::Pubkey as AnchorPubkey;

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

pub fn expert_lock_pda(expert: &Pubkey, event_id: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"expert_lock", expert.as_ref(), event_id.as_bytes()],
        &prog_id(),
    )
}

pub fn poker_pda(creator: &Pubkey, pool_count: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"poker", creator.as_ref(), &pool_count.to_le_bytes()],
        &prog_id(),
    )
}

pub fn poker_escrow_pda(poker_pool: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"poker_escrow", poker_pool.as_ref()], &prog_id())
}

// ── SVM setup ──

pub fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    let program_bytes = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/anturix.so"));
    svm.add_program(prog_id(), program_bytes);
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
    ap(&system_program::id())
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
    event_id: &str,
    prediction: &str,
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
            event_id: event_id.to_string(),
            prediction: prediction.to_string(),
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

pub fn ix_resolve_duel(admin: &Pubkey, duel_state: &Pubkey, winner: &Pubkey, loser: &Pubkey) -> Instruction {
    let (winner_profile, _) = profile_pda(winner);
    let (loser_profile, _) = profile_pda(loser);

    build_ix(
        anturix::accounts::ResolveDuel {
            admin: ap(admin),
            duel_state: ap(duel_state),
            winner_profile: ap(&winner_profile),
            loser_profile: ap(&loser_profile),
        },
        anturix::instruction::ResolveDuel { winner: ap(winner) }.data(),
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

pub fn ix_create_expert_lock(expert: &Pubkey, prediction_hash: [u8; 32], fee: u64, event_id: &str, expires_at: i64) -> Instruction {
    let (profile, _) = profile_pda(expert);
    let (lock, _) = expert_lock_pda(expert, event_id);

    build_ix(
        anturix::accounts::CreateExpertLock {
            expert: ap(expert),
            expert_profile: ap(&profile),
            expert_lock: ap(&lock),
            system_program: sys_id(),
        },
        anturix::instruction::CreateExpertLock {
            prediction_hash,
            fee,
            event_id: event_id.to_string(),
            expires_at,
        }.data(),
    )
}

pub fn ix_buy_expert_lock(buyer: &Pubkey, expert: &Pubkey, lock: &Pubkey) -> Instruction {
    build_ix(
        anturix::accounts::BuyExpertLock {
            buyer: ap(buyer),
            expert: ap(expert),
            expert_lock: ap(lock),
            system_program: sys_id(),
        },
        anturix::instruction::BuyExpertLock {}.data(),
    )
}

pub fn ix_reveal_expert_lock(expert: &Pubkey, lock: &Pubkey, prediction: &str, salt: [u8; 16]) -> Instruction {
    build_ix(
        anturix::accounts::RevealExpertLock {
            expert: ap(expert),
            expert_lock: ap(lock),
        },
        anturix::instruction::RevealExpertLock {
            prediction: prediction.to_string(),
            salt,
        }.data(),
    )
}

pub fn ix_resolve_expert_lock(admin: &Pubkey, lock: &Pubkey, expert: &Pubkey, correct: bool) -> Instruction {
    let (expert_profile, _) = profile_pda(expert);

    build_ix(
        anturix::accounts::ResolveExpertLock {
            admin: ap(admin),
            expert_lock: ap(lock),
            expert_profile: ap(&expert_profile),
        },
        anturix::instruction::ResolveExpertLock { correct }.data(),
    )
}

pub fn ix_create_poker_pool(creator: &Pubkey, pool_count: u64, buy_in: u64) -> Instruction {
    let (profile, _) = profile_pda(creator);
    let (pool, _) = poker_pda(creator, pool_count);
    let (escrow, _) = poker_escrow_pda(&pool);

    build_ix(
        anturix::accounts::CreatePokerPool {
            creator: ap(creator),
            creator_profile: ap(&profile),
            poker_pool: ap(&pool),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::CreatePokerPool { buy_in }.data(),
    )
}

pub fn ix_join_poker_pool(player: &Pubkey, pool: &Pubkey) -> Instruction {
    let (escrow, _) = poker_escrow_pda(pool);

    build_ix(
        anturix::accounts::JoinPokerPool {
            player: ap(player),
            poker_pool: ap(pool),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::JoinPokerPool {}.data(),
    )
}

pub fn ix_leave_poker_pool(player: &Pubkey, pool: &Pubkey) -> Instruction {
    let (escrow, _) = poker_escrow_pda(pool);

    build_ix(
        anturix::accounts::LeavePokerPool {
            player: ap(player),
            poker_pool: ap(pool),
            escrow: ap(&escrow),
            system_program: sys_id(),
        },
        anturix::instruction::LeavePokerPool {}.data(),
    )
}

pub fn ix_close_poker_pool(creator: &Pubkey, pool: &Pubkey, player_keys: &[Pubkey]) -> Instruction {
    let (escrow, _) = poker_escrow_pda(pool);

    let anchor_accounts = anturix::accounts::ClosePokerPool {
        creator: ap(creator),
        poker_pool: ap(pool),
        escrow: ap(&escrow),
        system_program: sys_id(),
    };
    let mut metas = convert_account_metas(anchor_accounts.to_account_metas(None));

    for key in player_keys {
        metas.push(AccountMeta::new(*key, false));
    }

    Instruction {
        program_id: prog_id(),
        accounts: metas,
        data: anturix::instruction::ClosePokerPool {}.data(),
    }
}

// ── Admin keypair ──

pub fn load_admin_keypair() -> Keypair {
    let kp_bytes = std::fs::read(
        concat!(env!("CARGO_MANIFEST_DIR"), "/../../tests/admin-keypair.json")
    ).unwrap();
    let bytes: Vec<u8> = serde_json::from_slice(&kp_bytes).unwrap();
    Keypair::from_bytes(&bytes).unwrap()
}

// ── Hash helper for expert lock ──

pub fn compute_prediction_hash(prediction: &str, salt: &[u8; 16]) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(prediction.as_bytes());
    hasher.update(salt);
    hasher.finalize().into()
}

// ── Account deserialization ──

pub fn get_account<T: AccountDeserialize>(
    svm: &LiteSVM,
    address: &Pubkey,
) -> T {
    let account = svm.get_account(address).expect("account not found");
    T::try_deserialize(&mut &account.data[..]).expect("failed to deserialize")
}

/// Convert solana_sdk Pubkey to anchor_lang Pubkey for comparisons
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

/// Advance LiteSVM slot to avoid AlreadyProcessed errors on duplicate-looking txs
pub fn advance_slot(svm: &mut LiteSVM) {
    svm.expire_blockhash();
}
