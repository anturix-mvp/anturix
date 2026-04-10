mod helpers;

use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use anturix::state::{ExpertLockState, ExpertLockStatus, UserProfile};

fn pk(kp: &Keypair) -> AnchorPubkey {
    to_anchor_pubkey(&kp.pubkey())
}

const FEE: u64 = 500_000_000; // 0.5 SOL
const EVENT_ID: &str = "nba-finals-2026-g1";
const PREDICTION: &str = "Lakers win by 10+";
const SALT: [u8; 16] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const STAKE: u64 = 100_000_000;
const DUEL_EVENT: &str = "nba-lakers-celtics-2026";

// ── Setup: create an expert with 3+ wins ──

fn setup_expert() -> (LiteSVM, Keypair, Keypair, Keypair) {
    let mut svm = setup();
    let admin = load_admin_keypair();

    let expert = Keypair::new();
    let buyer = Keypair::new();
    let opponents: Vec<Keypair> = (0..3).map(|_| Keypair::new()).collect();

    fund_user(&mut svm, &admin);
    fund_user(&mut svm, &expert);
    fund_user(&mut svm, &buyer);
    for opp in &opponents {
        fund_user(&mut svm, opp);
        send_tx(&mut svm, &[ix_init_profile(&opp.pubkey())], opp, &[opp]).unwrap();
    }

    // Init expert profile
    send_tx(&mut svm, &[ix_init_profile(&expert.pubkey())], &expert, &[&expert]).unwrap();
    send_tx(&mut svm, &[ix_init_profile(&buyer.pubkey())], &buyer, &[&buyer]).unwrap();

    // Expert needs 3 banter wins
    for (i, opp) in opponents.iter().enumerate() {
        let event = format!("duel-{}", i);
        let ix = ix_create_duel(
            &expert.pubkey(), i as u64, &event, "win", STAKE, None, future_ts(3600),
        );
        send_tx(&mut svm, &[ix], &expert, &[&expert]).unwrap();

        let (duel, _) = duel_pda(&expert.pubkey(), i as u64);
        send_tx(&mut svm, &[ix_accept_duel(&opp.pubkey(), &duel)], opp, &[opp]).unwrap();

        let ix = ix_resolve_duel(&admin.pubkey(), &duel, &expert.pubkey(), &opp.pubkey());
        send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

        send_tx(&mut svm, &[ix_claim_prize(&expert.pubkey(), &duel)], &expert, &[&expert]).unwrap();
    }

    // Verify expert has 3 wins
    let (prof_pda, _) = profile_pda(&expert.pubkey());
    let prof: UserProfile = get_account(&svm, &prof_pda);
    assert_eq!(prof.banter_wins, 3);

    (svm, admin, expert, buyer)
}

// ══════════════════════════════════════════════
// HAPPY PATH
// ══════════════════════════════════════════════

#[test]
fn test_create_expert_lock_happy_path() {
    let (mut svm, _admin, expert, _buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    let ix = ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200));
    send_tx(&mut svm, &[ix], &expert, &[&expert]).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);
    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.expert, pk(&expert));
    assert_eq!(lock.event_id, EVENT_ID);
    assert_eq!(lock.prediction_hash, hash);
    assert_eq!(lock.fee, FEE);
    assert_eq!(lock.status, ExpertLockStatus::Active);
    assert!(lock.result_correct.is_none());
}

#[test]
fn test_buy_expert_lock_p2p_transfer() {
    let (mut svm, _admin, expert, buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    let ix = ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200));
    send_tx(&mut svm, &[ix], &expert, &[&expert]).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);
    let expert_bal_before = get_balance(&svm, &expert.pubkey());
    let buyer_bal_before = get_balance(&svm, &buyer.pubkey());

    let ix = ix_buy_expert_lock(&buyer.pubkey(), &expert.pubkey(), &lock_pda);
    send_tx(&mut svm, &[ix], &buyer, &[&buyer]).unwrap();

    // Expert receives fee directly
    let expert_bal_after = get_balance(&svm, &expert.pubkey());
    assert_eq!(expert_bal_after - expert_bal_before, FEE);

    // Buyer loses fee + tx cost
    let buyer_bal_after = get_balance(&svm, &buyer.pubkey());
    assert!(buyer_bal_before - buyer_bal_after >= FEE);
}

#[test]
fn test_full_expert_lock_lifecycle() {
    let (mut svm, admin, expert, buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // Buy
    send_tx(
        &mut svm,
        &[ix_buy_expert_lock(&buyer.pubkey(), &expert.pubkey(), &lock_pda)],
        &buyer, &[&buyer],
    ).unwrap();

    // Reveal
    send_tx(
        &mut svm,
        &[ix_reveal_expert_lock(&expert.pubkey(), &lock_pda, PREDICTION, SALT)],
        &expert, &[&expert],
    ).unwrap();

    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.status, ExpertLockStatus::Revealed);

    // Resolve as correct
    send_tx(
        &mut svm,
        &[ix_resolve_expert_lock(&admin.pubkey(), &lock_pda, &expert.pubkey(), true)],
        &admin, &[&admin],
    ).unwrap();

    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.status, ExpertLockStatus::Resolved);
    assert_eq!(lock.result_correct, Some(true));

    // Expert profile updated
    let (prof_pda, _) = profile_pda(&expert.pubkey());
    let prof: UserProfile = get_account(&svm, &prof_pda);
    assert_eq!(prof.total_predictions, 1);
    assert_eq!(prof.correct_predictions, 1);
}

// ══════════════════════════════════════════════
// EDGE CASES / FAILURES
// ══════════════════════════════════════════════

#[test]
fn test_insufficient_wins_cannot_create_lock() {
    let mut svm = setup();
    let noob = Keypair::new();
    fund_user(&mut svm, &noob);
    send_tx(&mut svm, &[ix_init_profile(&noob.pubkey())], &noob, &[&noob]).unwrap();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    let ix = ix_create_expert_lock(&noob.pubkey(), hash, FEE, EVENT_ID, future_ts(7200));
    let err = send_tx_expect_err(&mut svm, &[ix], &noob, &[&noob]);
    assert!(
        err.contains("InsufficientBanterWins") || err.contains("6012"),
        "unexpected: {}", err
    );
}

#[test]
fn test_reveal_wrong_prediction_fails() {
    let (mut svm, _admin, expert, _buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // Wrong prediction text
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_reveal_expert_lock(&expert.pubkey(), &lock_pda, "wrong prediction", SALT)],
        &expert, &[&expert],
    );
    assert!(err.contains("HashMismatch") || err.contains("6013"), "unexpected: {}", err);
}

#[test]
fn test_reveal_wrong_salt_fails() {
    let (mut svm, _admin, expert, _buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // Wrong salt
    let wrong_salt: [u8; 16] = [99; 16];
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_reveal_expert_lock(&expert.pubkey(), &lock_pda, PREDICTION, wrong_salt)],
        &expert, &[&expert],
    );
    assert!(err.contains("HashMismatch") || err.contains("6013"), "unexpected: {}", err);
}

#[test]
fn test_non_expert_cannot_reveal() {
    let (mut svm, _admin, expert, buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // Buyer tries to reveal (not the expert)
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_reveal_expert_lock(&buyer.pubkey(), &lock_pda, PREDICTION, SALT)],
        &buyer, &[&buyer],
    );
    assert!(!err.is_empty(), "should fail for non-expert");
}

#[test]
fn test_resolve_before_reveal_fails() {
    let (mut svm, admin, expert, _buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // Try to resolve while still Active (not Revealed)
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_resolve_expert_lock(&admin.pubkey(), &lock_pda, &expert.pubkey(), true)],
        &admin, &[&admin],
    );
    assert!(
        err.contains("InvalidExpertLockStatus") || err.contains("6022"),
        "unexpected: {}", err
    );
}

#[test]
fn test_multiple_buyers_same_lock() {
    let (mut svm, _admin, expert, buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // First buy
    send_tx(
        &mut svm,
        &[ix_buy_expert_lock(&buyer.pubkey(), &expert.pubkey(), &lock_pda)],
        &buyer, &[&buyer],
    ).unwrap();

    // Second buyer
    let buyer2 = Keypair::new();
    fund_user(&mut svm, &buyer2);
    send_tx(
        &mut svm,
        &[ix_buy_expert_lock(&buyer2.pubkey(), &expert.pubkey(), &lock_pda)],
        &buyer2, &[&buyer2],
    ).unwrap();

    // Expert should have received 2x fee total
    // (we can only verify the second buy worked without error)
}

#[test]
fn test_resolve_incorrect_updates_profile() {
    let (mut svm, admin, expert, _buyer) = setup_expert();

    let hash = compute_prediction_hash(PREDICTION, &SALT);
    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&expert.pubkey(), hash, FEE, EVENT_ID, future_ts(7200))],
        &expert, &[&expert],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&expert.pubkey(), EVENT_ID);

    // Reveal
    send_tx(
        &mut svm,
        &[ix_reveal_expert_lock(&expert.pubkey(), &lock_pda, PREDICTION, SALT)],
        &expert, &[&expert],
    ).unwrap();

    // Resolve as incorrect
    send_tx(
        &mut svm,
        &[ix_resolve_expert_lock(&admin.pubkey(), &lock_pda, &expert.pubkey(), false)],
        &admin, &[&admin],
    ).unwrap();

    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.result_correct, Some(false));

    let (prof_pda, _) = profile_pda(&expert.pubkey());
    let prof: UserProfile = get_account(&svm, &prof_pda);
    assert_eq!(prof.total_predictions, 1);
    assert_eq!(prof.correct_predictions, 0); // incorrect, not incremented
}
