#[allow(dead_code, deprecated)]
mod helpers;

use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::pubkey::Pubkey;
use anturix::state::{DuelState, DuelStatus, UserProfile};

fn pk(kp: &Keypair) -> AnchorPubkey {
    to_anchor_pubkey(&kp.pubkey())
}

const STAKE: u64 = 100_000_000; // 0.1 SOL
const EVENT_ID: &str = "nba-lakers-celtics-2026";
const PREDICTION: &str = "Lakers win";

// ── Setup helpers ──

fn setup_two_players() -> (LiteSVM, Keypair, Keypair, Keypair) {
    let mut svm = setup();
    let admin = load_admin_keypair();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &admin);
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    // Init profiles
    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();

    (svm, admin, alice, bob)
}

fn create_duel(svm: &mut LiteSVM, creator: &Keypair) -> Pubkey {
    let ix = ix_create_duel(
        &creator.pubkey(), 0, EVENT_ID, PREDICTION, STAKE, None, future_ts(3600),
    );
    send_tx(svm, &[ix], creator, &[creator]).unwrap();
    let (duel, _) = duel_pda(&creator.pubkey(), 0);
    duel
}

// ══════════════════════════════════════════════
// HAPPY PATH
// ══════════════════════════════════════════════

#[test]
fn test_create_duel_public_pool() {
    let (mut svm, _admin, alice, _bob) = setup_two_players();

    let alice_bal_before = get_balance(&svm, &alice.pubkey());
    let duel = create_duel(&mut svm, &alice);

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.creator, pk(&alice));
    assert_eq!(state.opponent, AnchorPubkey::default()); // public pool
    assert_eq!(state.event_id, EVENT_ID);
    assert_eq!(state.stake_amount, STAKE);
    assert_eq!(state.status, DuelStatus::Pending);
    assert!(state.winner.is_none());

    // Escrow should have stake
    let (escrow, _) = escrow_pda(&duel);
    let escrow_bal = get_balance(&svm, &escrow);
    assert!(escrow_bal >= STAKE);

    // Creator balance should have decreased
    let alice_bal_after = get_balance(&svm, &alice.pubkey());
    assert!(alice_bal_before - alice_bal_after >= STAKE);

    // Profile duel_count should increment
    let (profile_pda, _) = profile_pda(&alice.pubkey());
    let profile: UserProfile = get_account(&svm, &profile_pda);
    assert_eq!(profile.duel_count, 1);
}

#[test]
fn test_create_duel_targeted() {
    let (mut svm, _admin, alice, bob) = setup_two_players();

    let ix = ix_create_duel(
        &alice.pubkey(), 0, EVENT_ID, PREDICTION, STAKE,
        Some(bob.pubkey()), future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();

    let (duel, _) = duel_pda(&alice.pubkey(), 0);
    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.opponent, pk(&bob)); // targeted
}

#[test]
fn test_accept_duel_public_pool() {
    let (mut svm, _admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    let bob_bal_before = get_balance(&svm, &bob.pubkey());
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.opponent, pk(&bob));
    assert_eq!(state.status, DuelStatus::Active);

    // Escrow should have 2x stake
    let (escrow, _) = escrow_pda(&duel);
    let escrow_bal = get_balance(&svm, &escrow);
    assert!(escrow_bal >= STAKE * 2);

    let bob_bal_after = get_balance(&svm, &bob.pubkey());
    assert!(bob_bal_before - bob_bal_after >= STAKE);
}

#[test]
fn test_full_duel_lifecycle() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    // Accept
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    // Resolve: alice wins
    let ix = ix_resolve_duel(&admin.pubkey(), &duel, &alice.pubkey(), &bob.pubkey());
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.status, DuelStatus::Resolved);
    assert_eq!(state.winner, Some(pk(&alice)));

    // Check profiles updated
    let (alice_prof_pda, _) = profile_pda(&alice.pubkey());
    let (bob_prof_pda, _) = profile_pda(&bob.pubkey());
    let alice_prof: UserProfile = get_account(&svm, &alice_prof_pda);
    let bob_prof: UserProfile = get_account(&svm, &bob_prof_pda);
    assert_eq!(alice_prof.banter_wins, 1);
    assert_eq!(alice_prof.banter_losses, 0);
    assert_eq!(bob_prof.banter_wins, 0);
    assert_eq!(bob_prof.banter_losses, 1);
    assert!(bob_prof.clown_until > 0); // clown punishment active

    // Claim prize
    let alice_bal_before = get_balance(&svm, &alice.pubkey());
    send_tx(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel)], &alice, &[&alice]).unwrap();

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.status, DuelStatus::Claimed);

    // Winner should receive both stakes
    let alice_bal_after = get_balance(&svm, &alice.pubkey());
    assert!(alice_bal_after > alice_bal_before);

    // Escrow should be empty
    let (escrow, _) = escrow_pda(&duel);
    let escrow_bal = get_balance(&svm, &escrow);
    assert_eq!(escrow_bal, 0);
}

// ══════════════════════════════════════════════
// CANCEL PATHS
// ══════════════════════════════════════════════

#[test]
fn test_cancel_duel_by_creator() {
    let (mut svm, _admin, alice, _bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    let alice_bal_before = get_balance(&svm, &alice.pubkey());
    send_tx(&mut svm, &[ix_cancel_duel(&alice.pubkey(), &duel)], &alice, &[&alice]).unwrap();

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.status, DuelStatus::Cancelled);

    // Refund should be received
    let alice_bal_after = get_balance(&svm, &alice.pubkey());
    assert!(alice_bal_after > alice_bal_before);

    // Escrow empty
    let (escrow, _) = escrow_pda(&duel);
    assert_eq!(get_balance(&svm, &escrow), 0);
}

#[test]
fn test_force_cancel_pending_duel() {
    let (mut svm, admin, alice, _bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    let alice_bal_before = get_balance(&svm, &alice.pubkey());
    let ix = ix_force_cancel_duel(
        &admin.pubkey(), &alice.pubkey(), &Pubkey::default(), &duel,
    );
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.status, DuelStatus::Cancelled);

    let alice_bal_after = get_balance(&svm, &alice.pubkey());
    assert!(alice_bal_after > alice_bal_before);
}

#[test]
fn test_force_cancel_active_duel() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    let alice_bal_before = get_balance(&svm, &alice.pubkey());
    let bob_bal_before = get_balance(&svm, &bob.pubkey());

    let ix = ix_force_cancel_duel(
        &admin.pubkey(), &alice.pubkey(), &bob.pubkey(), &duel,
    );
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let state: DuelState = get_account(&svm, &duel);
    assert_eq!(state.status, DuelStatus::Cancelled);

    // Both should get refunded
    let alice_bal_after = get_balance(&svm, &alice.pubkey());
    let bob_bal_after = get_balance(&svm, &bob.pubkey());
    assert!(alice_bal_after > alice_bal_before);
    assert!(bob_bal_after > bob_bal_before);
}

// ══════════════════════════════════════════════
// EDGE CASES / FAILURE CASES
// ══════════════════════════════════════════════

#[test]
fn test_stake_below_minimum_fails() {
    let (mut svm, _admin, alice, _bob) = setup_two_players();

    let ix = ix_create_duel(
        &alice.pubkey(), 0, EVENT_ID, PREDICTION,
        1_000, // way below MIN_STAKE
        None, future_ts(3600),
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("StakeTooLow") || err.contains("6000"), "unexpected: {}", err);
}

#[test]
fn test_self_duel_fails() {
    let (mut svm, _admin, alice, _bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    // Alice tries to accept her own duel
    let err = send_tx_expect_err(
        &mut svm, &[ix_accept_duel(&alice.pubkey(), &duel)], &alice, &[&alice],
    );
    assert!(err.contains("SelfDuel") || err.contains("6007"), "unexpected: {}", err);
}

#[test]
fn test_accept_targeted_duel_wrong_opponent_fails() {
    let (mut svm, _admin, alice, bob) = setup_two_players();
    let charlie = Keypair::new();
    fund_user(&mut svm, &charlie);
    send_tx(&mut svm, &[ix_init_profile(&charlie.pubkey())], &charlie, &[&charlie]).unwrap();

    // Create duel targeted at bob
    let ix = ix_create_duel(
        &alice.pubkey(), 0, EVENT_ID, PREDICTION, STAKE,
        Some(bob.pubkey()), future_ts(3600),
    );
    send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    let (duel, _) = duel_pda(&alice.pubkey(), 0);

    // Charlie tries to accept (not the target)
    let err = send_tx_expect_err(
        &mut svm, &[ix_accept_duel(&charlie.pubkey(), &duel)], &charlie, &[&charlie],
    );
    assert!(err.contains("WrongOpponent") || err.contains("6006"), "unexpected: {}", err);
}

#[test]
fn test_accept_already_active_fails() {
    let (mut svm, _admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    // Bob accepts
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    // Charlie tries to accept (already active)
    let charlie = Keypair::new();
    fund_user(&mut svm, &charlie);
    send_tx(&mut svm, &[ix_init_profile(&charlie.pubkey())], &charlie, &[&charlie]).unwrap();

    let err = send_tx_expect_err(
        &mut svm, &[ix_accept_duel(&charlie.pubkey(), &duel)], &charlie, &[&charlie],
    );
    assert!(err.contains("InvalidDuelStatus") || err.contains("6003"), "unexpected: {}", err);
}

#[test]
fn test_double_claim_fails() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();
    send_tx(&mut svm, &[ix_resolve_duel(&admin.pubkey(), &duel, &alice.pubkey(), &bob.pubkey())], &admin, &[&admin]).unwrap();
    send_tx(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel)], &alice, &[&alice]).unwrap();

    // Advance slot to avoid AlreadyProcessed
    advance_slot(&mut svm);

    // Second claim fails
    let err = send_tx_expect_err(
        &mut svm, &[ix_claim_prize(&alice.pubkey(), &duel)], &alice, &[&alice],
    );
    assert!(err.contains("InvalidDuelStatus") || err.contains("6003"), "unexpected: {}", err);
}

#[test]
fn test_loser_cannot_claim() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();
    send_tx(&mut svm, &[ix_resolve_duel(&admin.pubkey(), &duel, &alice.pubkey(), &bob.pubkey())], &admin, &[&admin]).unwrap();

    // Bob (loser) tries to claim
    let err = send_tx_expect_err(
        &mut svm, &[ix_claim_prize(&bob.pubkey(), &duel)], &bob, &[&bob],
    );
    assert!(err.contains("NotWinner") || err.contains("6011"), "unexpected: {}", err);
}

#[test]
fn test_cancel_active_duel_fails() {
    let (mut svm, _admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    // Creator tries to cancel active duel
    let err = send_tx_expect_err(
        &mut svm, &[ix_cancel_duel(&alice.pubkey(), &duel)], &alice, &[&alice],
    );
    assert!(err.contains("InvalidDuelStatus") || err.contains("6003"), "unexpected: {}", err);
}

#[test]
fn test_non_creator_cannot_cancel() {
    let (mut svm, _admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    // Bob tries to cancel alice's duel
    let err = send_tx_expect_err(
        &mut svm, &[ix_cancel_duel(&bob.pubkey(), &duel)], &bob, &[&bob],
    );
    assert!(!err.is_empty(), "should have failed");
}

#[test]
fn test_resolve_pending_duel_fails() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);

    // Try to resolve before accept
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_resolve_duel(&admin.pubkey(), &duel, &alice.pubkey(), &bob.pubkey())],
        &admin, &[&admin],
    );
    assert!(err.contains("InvalidDuelStatus") || err.contains("6003"), "unexpected: {}", err);
}

#[test]
fn test_non_admin_cannot_resolve() {
    let (mut svm, _admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    // Alice (not admin) tries to resolve
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_resolve_duel(&alice.pubkey(), &duel, &alice.pubkey(), &bob.pubkey())],
        &alice, &[&alice],
    );
    assert!(err.contains("UnauthorizedAdmin") || err.contains("6008"), "unexpected: {}", err);
}

#[test]
fn test_resolve_invalid_winner_fails() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

    // Try to resolve with a random winner
    let random = Keypair::new();
    fund_user(&mut svm, &random);
    send_tx(&mut svm, &[ix_init_profile(&random.pubkey())], &random, &[&random]).unwrap();

    let err = send_tx_expect_err(
        &mut svm,
        &[ix_resolve_duel(&admin.pubkey(), &duel, &random.pubkey(), &bob.pubkey())],
        &admin, &[&admin],
    );
    assert!(err.contains("InvalidWinner") || err.contains("6009"), "unexpected: {}", err);
}

#[test]
fn test_event_id_too_long_fails() {
    let (mut svm, _admin, alice, _bob) = setup_two_players();

    let long_event_id = "a".repeat(65);
    let ix = ix_create_duel(
        &alice.pubkey(), 0, &long_event_id, PREDICTION, STAKE, None, future_ts(3600),
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &alice, &[&alice]);
    assert!(err.contains("EventIdTooLong") || err.contains("6001"), "unexpected: {}", err);
}

#[test]
fn test_multiple_duels_increment_count() {
    let (mut svm, _admin, alice, _bob) = setup_two_players();

    // Create 3 duels
    for i in 0..3u64 {
        let ix = ix_create_duel(
            &alice.pubkey(), i, EVENT_ID, PREDICTION, STAKE, None, future_ts(3600),
        );
        send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();
    }

    let (profile_addr, _) = profile_pda(&alice.pubkey());
    let profile: UserProfile = get_account(&svm, &profile_addr);
    assert_eq!(profile.duel_count, 3);

    // All 3 duels should exist at different PDAs
    for i in 0..3u64 {
        let (duel, _) = duel_pda(&alice.pubkey(), i);
        let state: DuelState = get_account(&svm, &duel);
        assert_eq!(state.creator, pk(&alice));
    }
}

// ══════════════════════════════════════════════
// ESCROW ACCOUNTING
// ══════════════════════════════════════════════

#[test]
fn test_escrow_accounting_full_lifecycle() {
    let (mut svm, admin, alice, bob) = setup_two_players();
    let duel = create_duel(&mut svm, &alice);
    let (escrow_addr, _) = escrow_pda(&duel);

    // After create: escrow = stake
    let escrow_after_create = get_balance(&svm, &escrow_addr);
    assert!(escrow_after_create >= STAKE);

    // After accept: escrow = 2 * stake
    send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();
    let escrow_after_accept = get_balance(&svm, &escrow_addr);
    assert!(escrow_after_accept >= STAKE * 2);

    // After resolve: escrow unchanged
    send_tx(
        &mut svm,
        &[ix_resolve_duel(&admin.pubkey(), &duel, &alice.pubkey(), &bob.pubkey())],
        &admin, &[&admin],
    ).unwrap();
    let escrow_after_resolve = get_balance(&svm, &escrow_addr);
    assert_eq!(escrow_after_resolve, escrow_after_accept);

    // After claim: escrow = 0
    send_tx(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel)], &alice, &[&alice]).unwrap();
    let escrow_after_claim = get_balance(&svm, &escrow_addr);
    assert_eq!(escrow_after_claim, 0);
}
