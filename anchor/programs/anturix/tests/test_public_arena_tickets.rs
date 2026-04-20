mod helpers;
use anturix::state::{Condition, DuelMode, DuelState, PositionTicket, Side, DuelStatus};
use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::system_instruction;

const STAKE_CREATOR: u64 = 100_000_000;
const STAKE_BOB_1: u64 = 20_000_000;
const STAKE_CHARLIE: u64 = 10_000_000;
const STAKE_BOB_2: u64 = 20_000_000;

#[test]
fn test_public_arena_multi_entry_locked_odds_and_ticket_payouts() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    let charlie = Keypair::new();

    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);
    fund_user(&mut svm, &charlie);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();
    send_tx(&mut svm, &[ix_init_profile(&charlie.pubkey())], &charlie, &[&charlie]).unwrap();

    let expires_at = future_ts(3600);
    let create_ix = ix_create_duel_full_with_mode(
        &alice.pubkey(),
        0,
        SOL_USD_FEED,
        15_000_000_000,
        Condition::Above,
        STAKE_CREATOR,
        None,
        expires_at,
        0,
        0,
        [0u8; 32],
        DuelMode::PublicArena,
        Side::Up,
        &[],
    );
    send_tx(&mut svm, &[create_ix], &alice, &[&alice]).unwrap();

    let (duel_key, _) = duel_pda(&alice.pubkey(), 0);
    let (escrow_key, _) = escrow_pda(&duel_key);

    // Provide extra arena liquidity so multiple fixed-odds tickets can coexist safely.
    let top_up_ix = system_instruction::transfer(&alice.pubkey(), &escrow_key, 500_000_000);
    send_tx(&mut svm, &[top_up_ix], &alice, &[&alice]).unwrap();

    // Ticket #1 (bob): first Down entry.
    let bob_entry_1 = ix_accept_duel_with_params(
        &bob.pubkey(),
        &duel_key,
        1,
        Side::Down,
        STAKE_BOB_1,
    );
    send_tx(&mut svm, &[bob_entry_1], &bob, &[&bob]).unwrap();

    // Ticket #2 (charlie): small Up entry shifts pool composition.
    let charlie_entry = ix_accept_duel_with_params(
        &charlie.pubkey(),
        &duel_key,
        2,
        Side::Up,
        STAKE_CHARLIE,
    );
    send_tx(&mut svm, &[charlie_entry], &charlie, &[&charlie]).unwrap();

    // Ticket #3 (bob again): same wallet, later moment, same side Down -> different locked odds.
    let bob_entry_2 = ix_accept_duel_with_params(
        &bob.pubkey(),
        &duel_key,
        3,
        Side::Down,
        STAKE_BOB_2,
    );
    send_tx(&mut svm, &[bob_entry_2], &bob, &[&bob]).unwrap();

    let (bob_ticket_1_key, _) = ticket_pda(&duel_key, 1);
    let (bob_ticket_2_key, _) = ticket_pda(&duel_key, 3);

    let bob_ticket_1: PositionTicket = get_account(&svm, &bob_ticket_1_key);
    let bob_ticket_2: PositionTicket = get_account(&svm, &bob_ticket_2_key);

    assert_eq!(bob_ticket_1.owner, to_anchor_pubkey(&bob.pubkey()));
    assert_eq!(bob_ticket_2.owner, to_anchor_pubkey(&bob.pubkey()));
    assert_eq!(bob_ticket_1.side, Side::Down);
    assert_eq!(bob_ticket_2.side, Side::Down);

    // Core requirement: different locked odds per ticket at different moments.
    assert_ne!(bob_ticket_1.locked_odds_bps, bob_ticket_2.locked_odds_bps);

    // Resolve with Above=false so Down wins.
    set_clock(&mut svm, expires_at + 10);
    let pyth_account = create_mock_pyth_account(
        &mut svm,
        &SOL_USD_FEED,
        14_000_000_000,
        1_000_000,
        -8,
        expires_at + 5,
    );

    let resolve_ix = ix_resolve_duel(
        &alice.pubkey(),
        &duel_key,
        &alice.pubkey(),
        &bob.pubkey(),
        &pyth_account,
    );
    send_tx(&mut svm, &[resolve_ix], &alice, &[&alice]).unwrap();

    let duel: DuelState = get_account(&svm, &duel_key);
    assert_eq!(duel.status, DuelStatus::Resolved);
    assert_eq!(duel.winning_side, Side::Down);

    let escrow_before_claim_1 = get_balance(&svm, &escrow_key);
    send_tx(
        &mut svm,
        &[ix_claim_ticket(&bob.pubkey(), &duel_key, 1)],
        &bob,
        &[&bob],
    )
    .unwrap();
    let escrow_after_claim_1 = get_balance(&svm, &escrow_key);
    assert_eq!(escrow_before_claim_1 - escrow_after_claim_1, bob_ticket_1.potential_payout);

    let escrow_before_claim_2 = get_balance(&svm, &escrow_key);
    send_tx(
        &mut svm,
        &[ix_claim_ticket(&bob.pubkey(), &duel_key, 3)],
        &bob,
        &[&bob],
    )
    .unwrap();
    let escrow_after_claim_2 = get_balance(&svm, &escrow_key);
    assert_eq!(escrow_before_claim_2 - escrow_after_claim_2, bob_ticket_2.potential_payout);

    let bob_ticket_1_after: PositionTicket = get_account(&svm, &bob_ticket_1_key);
    let bob_ticket_2_after: PositionTicket = get_account(&svm, &bob_ticket_2_key);
    assert!(bob_ticket_1_after.claimed);
    assert!(bob_ticket_2_after.claimed);
}
