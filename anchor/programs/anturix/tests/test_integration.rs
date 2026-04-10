mod helpers;

use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use anturix::state::{UserProfile, DuelState, DuelStatus, ExpertLockState, ExpertLockStatus, PokerPool, PoolStatus};

/// Full end-to-end test exercising all 3 features in sequence.
///
/// Flow:
/// 1. Alice and Bob create profiles
/// 2. Alice wins 3 duels against Bob (earns expert status)
/// 3. Alice creates an expert lock, Charlie buys it
/// 4. Alice reveals, admin resolves as correct
/// 5. Alice creates a poker pool, Bob + Charlie + 3 others join (6/6)
/// 6. Creator closes pool (refund all)
/// 7. Verify all final account states
#[test]
fn test_full_program_integration() {
    let mut svm = setup();

    let admin = load_admin_keypair();

    let alice = Keypair::new();
    let bob = Keypair::new();
    let charlie = Keypair::new();
    let extra_players: Vec<Keypair> = (0..3).map(|_| Keypair::new()).collect();

    // Fund everyone
    for kp in [&admin, &alice, &bob, &charlie] {
        fund_user(&mut svm, kp);
    }
    for kp in &extra_players {
        fund_user(&mut svm, kp);
    }

    // ═══════════════════════════════════════
    // PHASE 1: Create profiles
    // ═══════════════════════════════════════

    for kp in [&alice, &bob, &charlie] {
        send_tx(&mut svm, &[ix_init_profile(&kp.pubkey())], kp, &[kp]).unwrap();
    }
    for kp in &extra_players {
        send_tx(&mut svm, &[ix_init_profile(&kp.pubkey())], kp, &[kp]).unwrap();
    }

    // ═══════════════════════════════════════
    // PHASE 2: Alice wins 3 duels against Bob
    // ═══════════════════════════════════════

    for i in 0..3u64 {
        let event = format!("duel-event-{}", i);
        let ix = ix_create_duel(
            &alice.pubkey(), i, &event, "alice wins", 100_000_000, None, future_ts(3600),
        );
        send_tx(&mut svm, &[ix], &alice, &[&alice]).unwrap();

        let (duel, _) = duel_pda(&alice.pubkey(), i);
        send_tx(&mut svm, &[ix_accept_duel(&bob.pubkey(), &duel)], &bob, &[&bob]).unwrap();

        let ix = ix_resolve_duel(&admin.pubkey(), &duel, &alice.pubkey(), &bob.pubkey());
        send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

        send_tx(&mut svm, &[ix_claim_prize(&alice.pubkey(), &duel)], &alice, &[&alice]).unwrap();

        // Verify duel state
        let state: DuelState = get_account(&svm, &duel);
        assert_eq!(state.status, DuelStatus::Claimed);
    }

    // Verify Alice has 3 wins, Bob has 3 losses
    let (alice_prof_addr, _) = profile_pda(&alice.pubkey());
    let alice_prof: UserProfile = get_account(&svm, &alice_prof_addr);
    assert_eq!(alice_prof.banter_wins, 3);
    assert_eq!(alice_prof.duel_count, 3);

    let (bob_prof_addr, _) = profile_pda(&bob.pubkey());
    let bob_prof: UserProfile = get_account(&svm, &bob_prof_addr);
    assert_eq!(bob_prof.banter_losses, 3);
    assert!(bob_prof.clown_until > 0); // clown active

    // ═══════════════════════════════════════
    // PHASE 3: Alice creates expert lock
    // ═══════════════════════════════════════

    let prediction = "Lakers take game 1 by 8+";
    let salt: [u8; 16] = [42; 16];
    let hash = compute_prediction_hash(prediction, &salt);
    let event_id = "nba-finals-g1-2026";
    let fee = 200_000_000; // 0.2 SOL

    send_tx(
        &mut svm,
        &[ix_create_expert_lock(&alice.pubkey(), hash, fee, event_id, future_ts(7200))],
        &alice, &[&alice],
    ).unwrap();

    let (lock_pda, _) = expert_lock_pda(&alice.pubkey(), event_id);
    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.status, ExpertLockStatus::Active);

    // Charlie buys the lock
    let alice_bal_before = get_balance(&svm, &alice.pubkey());
    send_tx(
        &mut svm,
        &[ix_buy_expert_lock(&charlie.pubkey(), &alice.pubkey(), &lock_pda)],
        &charlie, &[&charlie],
    ).unwrap();
    let alice_bal_after = get_balance(&svm, &alice.pubkey());
    assert_eq!(alice_bal_after - alice_bal_before, fee);

    // ═══════════════════════════════════════
    // PHASE 4: Reveal and resolve expert lock
    // ═══════════════════════════════════════

    send_tx(
        &mut svm,
        &[ix_reveal_expert_lock(&alice.pubkey(), &lock_pda, prediction, salt)],
        &alice, &[&alice],
    ).unwrap();

    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.status, ExpertLockStatus::Revealed);

    send_tx(
        &mut svm,
        &[ix_resolve_expert_lock(&admin.pubkey(), &lock_pda, &alice.pubkey(), true)],
        &admin, &[&admin],
    ).unwrap();

    let lock: ExpertLockState = get_account(&svm, &lock_pda);
    assert_eq!(lock.status, ExpertLockStatus::Resolved);
    assert_eq!(lock.result_correct, Some(true));

    let alice_prof: UserProfile = get_account(&svm, &alice_prof_addr);
    assert_eq!(alice_prof.total_predictions, 1);
    assert_eq!(alice_prof.correct_predictions, 1);

    // ═══════════════════════════════════════
    // PHASE 5: Create and fill poker pool
    // ═══════════════════════════════════════

    let pool_buy_in = 500_000_000; // 0.5 SOL
    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&alice.pubkey(), 0, pool_buy_in)],
        &alice, &[&alice],
    ).unwrap();

    let (pool_pda, _) = poker_pda(&alice.pubkey(), 0);

    // Bob, Charlie, and 3 extras join
    let joiners: Vec<&Keypair> = vec![&bob, &charlie]
        .into_iter()
        .chain(extra_players.iter())
        .collect();

    for joiner in &joiners {
        send_tx(
            &mut svm,
            &[ix_join_poker_pool(&joiner.pubkey(), &pool_pda)],
            joiner, &[joiner],
        ).unwrap();
    }

    let pool: PokerPool = get_account(&svm, &pool_pda);
    assert_eq!(pool.player_count, 6);
    assert_eq!(pool.status, PoolStatus::Full);

    // ═══════════════════════════════════════
    // PHASE 6: Close pool (refund all)
    // ═══════════════════════════════════════

    let all_player_keys: Vec<_> = std::iter::once(alice.pubkey())
        .chain(joiners.iter().map(|j| j.pubkey()))
        .collect();

    send_tx(
        &mut svm,
        &[ix_close_poker_pool(&alice.pubkey(), &pool_pda, &all_player_keys)],
        &alice, &[&alice],
    ).unwrap();

    // Pool account closed
    assert_eq!(get_balance(&svm, &pool_pda), 0);

    // ═══════════════════════════════════════
    // PHASE 7: Final state verification
    // ═══════════════════════════════════════

    let alice_prof: UserProfile = get_account(&svm, &alice_prof_addr);
    assert_eq!(alice_prof.banter_wins, 3);
    assert_eq!(alice_prof.banter_losses, 0);
    assert_eq!(alice_prof.total_predictions, 1);
    assert_eq!(alice_prof.correct_predictions, 1);
    assert_eq!(alice_prof.duel_count, 3);
    assert_eq!(alice_prof.pool_count, 1);

    let bob_prof: UserProfile = get_account(&svm, &bob_prof_addr);
    assert_eq!(bob_prof.banter_wins, 0);
    assert_eq!(bob_prof.banter_losses, 3);

    println!("=== INTEGRATION TEST PASSED ===");
    println!("Alice: 3 duel wins, 1 expert prediction (correct), 1 poker pool created");
    println!("Bob: 3 duel losses, clown_until active");
    println!("All escrows drained. All features exercised.");
}
