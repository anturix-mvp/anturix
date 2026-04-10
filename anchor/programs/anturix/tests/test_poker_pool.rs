mod helpers;

use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::pubkey::Pubkey;
use anturix::state::{PokerPool, PoolStatus};

fn pk(kp: &Keypair) -> AnchorPubkey {
    to_anchor_pubkey(&kp.pubkey())
}

const BUY_IN: u64 = 500_000_000; // 0.5 SOL

fn setup_players(count: usize) -> (LiteSVM, Vec<Keypair>) {
    let mut svm = setup();
    let mut players = Vec::new();
    for _ in 0..count {
        let kp = Keypair::new();
        fund_user(&mut svm, &kp);
        send_tx(&mut svm, &[ix_init_profile(&kp.pubkey())], &kp, &[&kp]).unwrap();
        players.push(kp);
    }
    (svm, players)
}

// ══════════════════════════════════════════════
// HAPPY PATH
// ══════════════════════════════════════════════

#[test]
fn test_create_poker_pool() {
    let (mut svm, players) = setup_players(1);
    let creator = &players[0];

    let ix = ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN);
    send_tx(&mut svm, &[ix], creator, &[creator]).unwrap();

    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);
    let pool: PokerPool = get_account(&svm, &pool_pda);

    assert_eq!(pool.creator, pk(creator));
    assert_eq!(pool.buy_in, BUY_IN);
    assert_eq!(pool.player_count, 1);
    assert_eq!(pool.players[0], pk(creator));
    assert_eq!(pool.status, PoolStatus::Open);

    // Escrow should have buy_in
    let (escrow, _) = poker_escrow_pda(&pool_pda);
    assert!(get_balance(&svm, &escrow) >= BUY_IN);
}

#[test]
fn test_join_poker_pool() {
    let (mut svm, players) = setup_players(3);
    let creator = &players[0];

    let ix = ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN);
    send_tx(&mut svm, &[ix], creator, &[creator]).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Player 2 joins
    send_tx(
        &mut svm,
        &[ix_join_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();

    let pool: PokerPool = get_account(&svm, &pool_pda);
    assert_eq!(pool.player_count, 2);
    assert_eq!(pool.players[1], pk(&players[1]));
    assert_eq!(pool.status, PoolStatus::Open);

    // Escrow should have 2x buy_in
    let (escrow, _) = poker_escrow_pda(&pool_pda);
    assert!(get_balance(&svm, &escrow) >= BUY_IN * 2);
}

#[test]
fn test_fill_pool_to_full() {
    let (mut svm, players) = setup_players(6);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Join 5 more players
    for i in 1..6 {
        send_tx(
            &mut svm,
            &[ix_join_poker_pool(&players[i].pubkey(), &pool_pda)],
            &players[i], &[&players[i]],
        ).unwrap();
    }

    let pool: PokerPool = get_account(&svm, &pool_pda);
    assert_eq!(pool.player_count, 6);
    assert_eq!(pool.status, PoolStatus::Full);

    // Escrow should have 6x buy_in
    let (escrow, _) = poker_escrow_pda(&pool_pda);
    assert!(get_balance(&svm, &escrow) >= BUY_IN * 6);
}

#[test]
fn test_leave_poker_pool_refund() {
    let (mut svm, players) = setup_players(3);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Player 2 joins
    send_tx(
        &mut svm,
        &[ix_join_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();

    // Player 2 leaves
    let bal_before = get_balance(&svm, &players[1].pubkey());
    send_tx(
        &mut svm,
        &[ix_leave_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();

    let pool: PokerPool = get_account(&svm, &pool_pda);
    assert_eq!(pool.player_count, 1);
    assert_eq!(pool.players[1], AnchorPubkey::default()); // cleared

    // Player should get refund
    let bal_after = get_balance(&svm, &players[1].pubkey());
    assert!(bal_after > bal_before);
}

#[test]
fn test_last_player_leaves_drains_all() {
    let (mut svm, players) = setup_players(1);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Creator leaves (last player)
    send_tx(
        &mut svm,
        &[ix_leave_poker_pool(&creator.pubkey(), &pool_pda)],
        creator, &[creator],
    ).unwrap();

    let pool: PokerPool = get_account(&svm, &pool_pda);
    assert_eq!(pool.player_count, 0);
    assert_eq!(pool.status, PoolStatus::Closed);

    // Escrow should be fully drained
    let (escrow, _) = poker_escrow_pda(&pool_pda);
    assert_eq!(get_balance(&svm, &escrow), 0);
}

#[test]
fn test_close_full_pool_refunds_all() {
    let (mut svm, players) = setup_players(6);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    for i in 1..6 {
        send_tx(
            &mut svm,
            &[ix_join_poker_pool(&players[i].pubkey(), &pool_pda)],
            &players[i], &[&players[i]],
        ).unwrap();
    }

    // Record balances before close
    let bals_before: Vec<u64> = players.iter().map(|p| get_balance(&svm, &p.pubkey())).collect();

    // Close pool (refund all)
    let player_keys: Vec<Pubkey> = players.iter().map(|p| p.pubkey()).collect();
    let ix = ix_close_poker_pool(&creator.pubkey(), &pool_pda, &player_keys);
    send_tx(&mut svm, &[ix], creator, &[creator]).unwrap();

    // All players should get buy_in back
    for (i, player) in players.iter().enumerate() {
        let bal_after = get_balance(&svm, &player.pubkey());
        if i == 0 {
            // Creator pays tx fee but gets buy_in + rent back
            assert!(bal_after > bals_before[i]);
        } else {
            assert!(bal_after > bals_before[i], "player {} not refunded", i);
        }
    }

    // Pool account should be closed (no data)
    assert_eq!(get_balance(&svm, &pool_pda), 0);
}

// ══════════════════════════════════════════════
// EDGE CASES / FAILURES
// ══════════════════════════════════════════════

#[test]
fn test_join_full_pool_fails() {
    let (mut svm, players) = setup_players(7);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    for i in 1..6 {
        send_tx(
            &mut svm,
            &[ix_join_poker_pool(&players[i].pubkey(), &pool_pda)],
            &players[i], &[&players[i]],
        ).unwrap();
    }

    // 7th player tries to join -- fails because pool is Full (status check fires first)
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_join_poker_pool(&players[6].pubkey(), &pool_pda)],
        &players[6], &[&players[6]],
    );
    assert!(
        err.contains("PoolFull") || err.contains("6016")
            || err.contains("InvalidPoolStatus") || err.contains("6019"),
        "unexpected: {}", err
    );
}

#[test]
fn test_join_pool_twice_fails() {
    let (mut svm, players) = setup_players(2);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    send_tx(
        &mut svm,
        &[ix_join_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();

    // Advance slot to avoid AlreadyProcessed
    advance_slot(&mut svm);

    // Same player tries to join again
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_join_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    );
    assert!(err.contains("AlreadyInPool") || err.contains("6017"), "unexpected: {}", err);
}

#[test]
fn test_leave_full_pool_fails() {
    let (mut svm, players) = setup_players(6);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    for i in 1..6 {
        send_tx(
            &mut svm,
            &[ix_join_poker_pool(&players[i].pubkey(), &pool_pda)],
            &players[i], &[&players[i]],
        ).unwrap();
    }

    // Try to leave after pool is full
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_leave_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    );
    assert!(err.contains("InvalidPoolStatus") || err.contains("6019"), "unexpected: {}", err);
}

#[test]
fn test_non_member_cannot_leave() {
    let (mut svm, players) = setup_players(2);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Player 2 never joined, tries to leave
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_leave_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    );
    assert!(err.contains("PlayerNotInPool") || err.contains("6018"), "unexpected: {}", err);
}

#[test]
fn test_non_creator_cannot_close() {
    let (mut svm, players) = setup_players(2);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Non-creator tries to close
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_close_poker_pool(&players[1].pubkey(), &pool_pda, &[])],
        &players[1], &[&players[1]],
    );
    assert!(!err.is_empty(), "should fail for non-creator");
}

#[test]
fn test_close_open_pool_fails() {
    let (mut svm, players) = setup_players(2);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Try to close while still Open
    let err = send_tx_expect_err(
        &mut svm,
        &[ix_close_poker_pool(&creator.pubkey(), &pool_pda, &[])],
        creator, &[creator],
    );
    assert!(err.contains("InvalidPoolStatus") || err.contains("6019"), "unexpected: {}", err);
}

#[test]
fn test_zero_buy_in_fails() {
    let (mut svm, players) = setup_players(1);
    let creator = &players[0];

    let ix = ix_create_poker_pool(&creator.pubkey(), 0, 0);
    let err = send_tx_expect_err(&mut svm, &[ix], creator, &[creator]);
    assert!(err.contains("InvalidBuyIn") || err.contains("6020"), "unexpected: {}", err);
}

#[test]
fn test_swap_remove_correctness() {
    let (mut svm, players) = setup_players(4);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);

    // Join players 1, 2, 3
    for i in 1..4 {
        send_tx(
            &mut svm,
            &[ix_join_poker_pool(&players[i].pubkey(), &pool_pda)],
            &players[i], &[&players[i]],
        ).unwrap();
    }

    // Player 1 leaves (middle of array). Player 3 should swap to slot 1.
    send_tx(
        &mut svm,
        &[ix_leave_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();

    let pool: PokerPool = get_account(&svm, &pool_pda);
    assert_eq!(pool.player_count, 3);
    // Slot 0: creator, Slot 1: player 3 (swapped), Slot 2: player 2
    assert_eq!(pool.players[0], pk(&players[0]));
    assert_eq!(pool.players[1], pk(&players[3])); // swapped from last
    assert_eq!(pool.players[2], pk(&players[2]));
    assert_eq!(pool.players[3], AnchorPubkey::default()); // cleared
}

// ══════════════════════════════════════════════
// ESCROW ACCOUNTING
// ══════════════════════════════════════════════

#[test]
fn test_poker_escrow_accounting() {
    let (mut svm, players) = setup_players(3);
    let creator = &players[0];

    send_tx(
        &mut svm,
        &[ix_create_poker_pool(&creator.pubkey(), 0, BUY_IN)],
        creator, &[creator],
    ).unwrap();
    let (pool_pda, _) = poker_pda(&creator.pubkey(), 0);
    let (escrow, _) = poker_escrow_pda(&pool_pda);

    // After create: 1x buy_in
    assert!(get_balance(&svm, &escrow) >= BUY_IN);

    // Player 2 joins: 2x
    send_tx(
        &mut svm,
        &[ix_join_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();
    assert!(get_balance(&svm, &escrow) >= BUY_IN * 2);

    // Player 2 leaves: 1x
    send_tx(
        &mut svm,
        &[ix_leave_poker_pool(&players[1].pubkey(), &pool_pda)],
        &players[1], &[&players[1]],
    ).unwrap();
    let bal_after_leave = get_balance(&svm, &escrow);
    assert!(bal_after_leave >= BUY_IN);
    assert!(bal_after_leave < BUY_IN * 2);
}
