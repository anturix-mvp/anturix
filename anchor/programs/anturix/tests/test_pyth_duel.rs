mod helpers;
use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use anturix::state::{DuelState, DuelStatus, Condition, UserProfile};

const STAKE: u64 = 100_000_000; // 0.1 SOL
// SOL/USD: price = 15000000000, exponent = -8 → $150.00
const SOL_PRICE: i64 = 15_000_000_000;
const SOL_EXPONENT: i32 = -8;
const SOL_CONF: u64 = 1_000_000; // $0.01 confidence

// ── Lifecycle tests ──

#[test]
fn test_create_duel_above_condition() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    // Init profile
    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();

    // Create duel: SOL above $150
    let target_price = SOL_PRICE; // $150.00 in Pyth format
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, target_price, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.price_feed_id, SOL_USD_FEED);
    assert_eq!(duel.target_price, target_price);
    assert_eq!(duel.condition, Condition::Above);
    assert_eq!(duel.status, DuelStatus::Pending);
    assert_eq!(duel.stake_amount, STAKE);
}

#[test]
fn test_create_duel_below_condition() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();

    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        BTC_USD_FEED, 5_000_000_000_000, Condition::Below, // BTC below $50k
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.condition, Condition::Below);
}

#[test]
fn test_full_lifecycle_creator_wins() {
    let mut svm = setup();
    let alice = Keypair::new(); // creator: bets SOL > $150
    let bob = Keypair::new();   // opponent: bets SOL <= $150
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    // Init profiles
    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    // Create duel: SOL above $150, expires in 1 hour
    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);

    // Accept duel
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Active);

    // Warp clock past expiry
    set_clock(&mut svm, expires_at + 10);

    // Create Pyth account: SOL = $160 (above target $150) → creator wins
    let oracle_price = 16_000_000_000i64; // $160.00
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, oracle_price, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    // Resolve — use alice as resolver (could be anyone)
    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Resolved);
    assert_eq!(duel.winner, Some(to_anchor_pubkey(&alice.pubkey())));

    // Check profiles
    let (alice_prof_key, _) = profile_pda(&alice.pubkey());
    let alice_prof: UserProfile = get_account(&svm, &alice_prof_key);
    assert_eq!(alice_prof.wins, 1);
    assert_eq!(alice_prof.losses, 0);

    let (bob_prof_key, _) = profile_pda(&bob.pubkey());
    let bob_prof: UserProfile = get_account(&svm, &bob_prof_key);
    assert_eq!(bob_prof.wins, 0);
    assert_eq!(bob_prof.losses, 1);

    // Claim prize
    let alice_balance_before = get_balance(&svm, &alice.pubkey());
    send_tx(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel_key)], &alice, &[&alice]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Claimed);

    let alice_balance_after = get_balance(&svm, &alice.pubkey());
    assert!(alice_balance_after > alice_balance_before);
}

#[test]
fn test_full_lifecycle_opponent_wins() {
    let mut svm = setup();
    let alice = Keypair::new(); // creator: bets SOL > $150
    let bob = Keypair::new();   // opponent: wins if SOL <= $150
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // SOL = $140 (below target $150) → opponent wins
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 14_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    let ix = ix_resolve_duel(
        &bob.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    send_tx(&mut svm, &[ix], &bob, &[&bob]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.winner, Some(to_anchor_pubkey(&bob.pubkey())));

    // Bob claims
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_claim_prize(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Claimed);
}

#[test]
fn test_exact_price_opponent_wins() {
    // Strict inequality: price == target → condition NOT met → opponent wins
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above, // creator bets price > target
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Price == target exactly
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, SOL_PRICE, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.winner, Some(to_anchor_pubkey(&bob.pubkey())), "exact price should make opponent win");
}

// ── Permissionless resolve ──

#[test]
fn test_permissionless_resolve() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    let cranker = Keypair::new(); // random third party
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);
    fund_user(&mut svm, &cranker);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    // Cranker (not admin, not participant) resolves
    let ix = ix_resolve_duel(
        &cranker.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    send_tx(&mut svm, &[ix], &cranker, &[&cranker]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Resolved);
}

// ── Error cases ──

#[test]
fn test_stale_price_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 100);

    // Price published 60 seconds ago (max age is 30)
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 30,
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("PriceTooStale") || err.contains("6011"), "expected PriceTooStale, got: {err}");
}

#[test]
fn test_wrong_feed_id_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    // Duel uses SOL/USD feed
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Pass BTC/USD feed instead of SOL/USD
    let pyth_account = create_mock_pyth_account(
        &mut svm, &BTC_USD_FEED, 5_000_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("InvalidPriceFeed") || err.contains("6010"), "expected InvalidPriceFeed, got: {err}");
}

#[test]
fn test_resolve_before_expiry_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    // Clock BEFORE expiry — don't warp
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, future_ts(0),
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("DuelNotExpired") || err.contains("6003"), "expected DuelNotExpired, got: {err}");
}

#[test]
fn test_resolve_pending_duel_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);

    set_clock(&mut svm, expires_at + 10);

    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    // Try resolve without accept — duel is still Pending
    // opponent_profile won't exist (default Pubkey), so this should fail
    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(!err.is_empty(), "expected error for pending duel resolve");
}

#[test]
fn test_wrong_pyth_owner_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Create fake account with wrong owner (system program instead of Pyth)
    let data = build_mock_price_update(&SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5);
    let fake_key = solana_sdk::signature::Keypair::new().pubkey();
    let fake_account = solana_sdk::account::Account {
        lamports: 1_000_000_000,
        data,
        owner: solana_sdk::system_program::id(), // wrong owner!
        executable: false,
        rent_epoch: 0,
    };
    svm.set_account(fake_key, fake_account).unwrap();

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &fake_key,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("InvalidPriceAccount") || err.contains("6012"), "expected InvalidPriceAccount, got: {err}");
}

// ── Cancel paths ──

#[test]
fn test_cancel_duel_works() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    let balance_before = get_balance(&svm, &alice.pubkey());

    send_tx(&mut svm, &[ix_cancel_duel(&alice.pubkey(), &duel_key)], &alice, &[&alice]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Cancelled);

    let balance_after = get_balance(&svm, &alice.pubkey());
    assert!(balance_after > balance_before, "creator should get refund");
}

// ── Escrow accounting ──

#[test]
fn test_escrow_accounting() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    let (escrow_key, _) = escrow_pda(&duel_key);

    // After create: escrow has 1x stake
    let escrow_after_create = get_balance(&svm, &escrow_key);
    assert!(escrow_after_create >= STAKE, "escrow should have creator's stake");

    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    // After accept: escrow has 2x stake
    let escrow_after_accept = get_balance(&svm, &escrow_key);
    assert!(escrow_after_accept >= 2 * STAKE, "escrow should have both stakes");
}

// ══════════════════════════════════════════════
// SECURITY EDGE CASES & EXPLOIT TESTS
// ══════════════════════════════════════════════

// ── Double-action prevention ──

#[test]
fn test_double_resolve_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &pyth_account,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    // Second resolve should fail — status is Resolved, not Active
    let pyth2 = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 14_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 8,
    );
    let ix2 = ix_resolve_duel(
        &bob.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &pyth2,
    );
    let err = send_tx_expect_err(&mut svm, &[ix2], &bob, &[&bob]);
    assert!(err.contains("InvalidDuelStatus"), "double resolve should fail, got: {err}");
}

#[test]
fn test_double_claim_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    send_tx(&mut svm, &[ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &pyth_account,
    )], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    // First claim succeeds
    send_tx(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel_key)], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    // Second claim should fail — status is Claimed
    let err = send_tx_expect_err(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel_key)], &alice, &[&alice]);
    assert!(err.contains("InvalidDuelStatus"), "double claim should fail, got: {err}");
}

// ── Unauthorized actions ──

#[test]
fn test_claim_by_loser_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    // Alice wins (price above target)
    send_tx(&mut svm, &[ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &pyth_account,
    )], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    // Bob (loser) tries to claim
    let err = send_tx_expect_err(&mut svm, &[ix_claim_prize(&bob.pubkey(), &duel_key)], &bob, &[&bob]);
    assert!(err.contains("NotWinner"), "loser claiming should fail, got: {err}");
}

#[test]
fn test_claim_without_resolve_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    // Try claim on Active duel (not Resolved)
    let err = send_tx_expect_err(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel_key)], &alice, &[&alice]);
    assert!(err.contains("InvalidDuelStatus"), "claim without resolve should fail, got: {err}");
}

#[test]
fn test_cancel_active_duel_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    // Creator tries to cancel after opponent accepted — should fail
    let err = send_tx_expect_err(&mut svm, &[ix_cancel_duel(&alice.pubkey(), &duel_key)], &alice, &[&alice]);
    assert!(err.contains("InvalidDuelStatus"), "cancel active duel should fail, got: {err}");
}

// ── Self-duel prevention ──

#[test]
fn test_self_duel_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);

    // Alice tries to accept her own duel
    let err = send_tx_expect_err(&mut svm, &[ix_accept_duel(&alice.pubkey(), &duel_key)], &alice, &[&alice]);
    assert!(err.contains("SelfDuel"), "self-duel should be rejected, got: {err}");
}

#[test]
fn test_targeted_duel_wrong_opponent_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    let charlie = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);
    fund_user(&mut svm, &charlie);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&charlie.pubkey())], &charlie, &[&charlie]).unwrap();
    advance_slot(&mut svm);

    // Duel targeted at Bob
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, Some(bob.pubkey()), future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);

    // Charlie tries to accept targeted duel
    let err = send_tx_expect_err(&mut svm, &[ix_accept_duel(&charlie.pubkey(), &duel_key)], &charlie, &[&charlie]);
    assert!(err.contains("WrongOpponent"), "wrong opponent should be rejected, got: {err}");

    // Bob can accept
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Active);
}

// ── Accept edge cases ──

#[test]
fn test_accept_expired_duel_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);

    // Warp past expiry
    set_clock(&mut svm, expires_at + 10);

    let err = send_tx_expect_err(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]);
    assert!(err.contains("DuelExpired"), "accepting expired duel should fail, got: {err}");
}

#[test]
fn test_accept_cancelled_duel_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_cancel_duel(&alice.pubkey(), &duel_key)], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let err = send_tx_expect_err(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]);
    assert!(err.contains("InvalidDuelStatus"), "accepting cancelled duel should fail, got: {err}");
}

// ── Input validation ──

#[test]
fn test_zero_stake_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        0, // zero stake
        None, future_ts(3600),
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("StakeTooLow"), "zero stake should be rejected, got: {err}");
}

#[test]
fn test_below_minimum_stake_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        9_999_999, // just below MIN_STAKE (0.01 SOL = 10_000_000)
        None, future_ts(3600),
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("StakeTooLow"), "below min stake should be rejected, got: {err}");
}

#[test]
fn test_zero_target_price_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, 0, Condition::Above,
        STAKE, None, future_ts(3600),
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("InvalidTargetPrice"), "zero target price should be rejected, got: {err}");
}

#[test]
fn test_too_short_expiry_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    // Set clock to a known time so we can test relative expiry
    let now = 1_700_000_000i64;
    set_clock(&mut svm, now);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    set_clock(&mut svm, now); // re-set after advance

    // Expires in 30 seconds (below MIN_EXPIRY_DURATION of 60)
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, now + 30,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("InvalidExpiry"), "too short expiry should be rejected, got: {err}");
}

// ── Oracle exploit prevention ──

#[test]
fn test_confidence_too_wide_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Confidence is 10% of price (way above 5% threshold)
    let wide_conf = (SOL_PRICE as u64) / 10; // 10%
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, wide_conf, SOL_EXPONENT, expires_at + 5,
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &pyth_account,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("PriceConfidenceTooWide") || err.contains("6014"),
        "wide confidence should be rejected, got: {err}");
}

#[test]
fn test_partial_verification_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Build account with Partial verification (variant 0 instead of 1)
    let mut data = build_mock_price_update(&SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5);
    data[40] = 0; // Partial verification

    let fake_key = solana_sdk::signature::Keypair::new().pubkey();
    let fake_account = solana_sdk::account::Account {
        lamports: 1_000_000_000,
        data,
        owner: PYTH_RECEIVER_ID,
        executable: false,
        rent_epoch: 0,
    };
    svm.set_account(fake_key, fake_account).unwrap();

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &fake_key,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("InvalidPriceAccount"), "partial verification should be rejected, got: {err}");
}

#[test]
fn test_truncated_pyth_data_rejected() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Truncated data — only 50 bytes (minimum is 101)
    let truncated_data = vec![0u8; 50];
    let fake_key = solana_sdk::signature::Keypair::new().pubkey();
    let fake_account = solana_sdk::account::Account {
        lamports: 1_000_000_000,
        data: truncated_data,
        owner: PYTH_RECEIVER_ID,
        executable: false,
        rent_epoch: 0,
    };
    svm.set_account(fake_key, fake_account).unwrap();

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &fake_key,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("InvalidPriceAccount"), "truncated data should be rejected, got: {err}");
}

// ── Duel count and multiple duels ──

#[test]
fn test_multiple_duels_from_same_creator() {
    let mut svm = setup();
    let alice = Keypair::new();
    fund_user(&mut svm, &alice);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    // Create 3 duels in sequence
    for i in 0u64..3 {
        let ix = ix_create_duel(
            &alice.pubkey(), i,
            SOL_USD_FEED, SOL_PRICE + (i as i64 * 1_000_000_000),
            Condition::Above, STAKE, None, future_ts(3600),
        );
        send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
        advance_slot(&mut svm);
    }

    // Verify duel_count incremented
    let (prof_key, _) = profile_pda(&alice.pubkey());
    let prof: UserProfile = get_account(&svm, &prof_key);
    assert_eq!(prof.duel_count, 3, "duel_count should be 3");

    // Verify each duel has distinct PDA
    let (d0, _) = duel_pda(&alice.pubkey(), 0);
    let (d1, _) = duel_pda(&alice.pubkey(), 1);
    let (d2, _) = duel_pda(&alice.pubkey(), 2);
    assert_ne!(d0, d1);
    assert_ne!(d1, d2);

    // Verify each duel has correct target
    let duel0: DuelState = get_account(&svm, &d0);
    let duel2: DuelState = get_account(&svm, &d2);
    assert_eq!(duel0.target_price, SOL_PRICE);
    assert_eq!(duel2.target_price, SOL_PRICE + 2_000_000_000);
}

// ── Expire cancel edge cases ──

#[test]
fn test_expire_cancel_active_duel_fails() {
    // expire_cancel only works on Pending duels, not Active
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    let cranker = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);
    fund_user(&mut svm, &cranker);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // Cranker tries expire_cancel on Active duel
    let err = send_tx_expect_err(&mut svm, &[
        ix_expire_cancel_duel(&cranker.pubkey(), &alice.pubkey(), &duel_key)
    ], &cranker, &[&cranker]);
    assert!(err.contains("InvalidDuelStatus"), "expire_cancel on active duel should fail, got: {err}");
}

// ── Resolve on cancelled duel ──

#[test]
fn test_resolve_cancelled_duel_fails() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, SOL_USD_FEED, SOL_PRICE, Condition::Above,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);

    // Cancel the duel
    send_tx(&mut svm, &[ix_cancel_duel(&alice.pubkey(), &duel_key)], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 16_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    // Try to resolve cancelled duel — opponent PDA won't match
    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key, &alice.pubkey(), &bob.pubkey(), &pyth_account,
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(!err.is_empty(), "resolving cancelled duel should fail");
}

// ── Below condition test ──

#[test]
fn test_below_condition_creator_wins() {
    let mut svm = setup();
    let alice = Keypair::new(); // bets SOL < $150
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    let expires_at = future_ts(3600);
    let ix = ix_create_duel(
        &alice.pubkey(), 0,
        SOL_USD_FEED, SOL_PRICE, Condition::Below,
        STAKE, None, expires_at,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    advance_slot(&mut svm);

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel_key)], &bob, &[&bob]).unwrap();
    advance_slot(&mut svm);

    set_clock(&mut svm, expires_at + 10);

    // SOL = $140 → below $150 → creator wins
    let pyth_account = create_mock_pyth_account(
        &mut svm, &SOL_USD_FEED, 14_000_000_000, SOL_CONF, SOL_EXPONENT, expires_at + 5,
    );

    let ix = ix_resolve_duel(
        &alice.pubkey(), &duel_key,
        &alice.pubkey(), &bob.pubkey(),
        &pyth_account,
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.winner, Some(to_anchor_pubkey(&alice.pubkey())));
}
