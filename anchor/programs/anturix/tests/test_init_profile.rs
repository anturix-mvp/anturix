#[allow(dead_code, deprecated)]
mod helpers;

use helpers::*;
use solana_sdk::signature::{Keypair, Signer};
use anturix::state::UserProfile;

fn pk(kp: &Keypair) -> AnchorPubkey {
    to_anchor_pubkey(&kp.pubkey())
}

#[test]
fn test_init_profile_happy_path() {
    let mut svm = setup();
    let user = Keypair::new();
    fund_user(&mut svm, &user);

    let ix = ix_init_profile(&user.pubkey());
    send_tx(&mut svm, &[ix], &user, &[&user]).unwrap();

    let (pda, _) = profile_pda(&user.pubkey());
    let profile: UserProfile = get_account(&svm, &pda);

    assert_eq!(profile.owner, pk(&user));
    assert_eq!(profile.wins, 0);
    assert_eq!(profile.losses, 0);
    assert_eq!(profile.clown_until, 0);
    assert_eq!(profile.duel_count, 0);
}

#[test]
fn test_init_profile_double_init_fails() {
    let mut svm = setup();
    let user = Keypair::new();
    fund_user(&mut svm, &user);

    let ix = ix_init_profile(&user.pubkey());
    send_tx(&mut svm, &[ix.clone()], &user, &[&user]).unwrap();

    // Second init should fail (account already exists)
    let err = send_tx_expect_err(&mut svm, &[ix], &user, &[&user]);
    assert!(err.contains("already in use") || err.contains("Already"), "unexpected error: {}", err);
}

#[test]
fn test_two_users_separate_profiles() {
    let mut svm = setup();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund_user(&mut svm, &alice);
    fund_user(&mut svm, &bob);

    send_tx(&mut svm, &[ix_init_profile(&alice.pubkey())], &alice, &[&alice]).unwrap();
    send_tx(&mut svm, &[ix_init_profile(&bob.pubkey())], &bob, &[&bob]).unwrap();

    let (alice_pda, _) = profile_pda(&alice.pubkey());
    let (bob_pda, _) = profile_pda(&bob.pubkey());

    let alice_profile: UserProfile = get_account(&svm, &alice_pda);
    let bob_profile: UserProfile = get_account(&svm, &bob_pda);

    assert_eq!(alice_profile.owner, pk(&alice));
    assert_eq!(bob_profile.owner, pk(&bob));
    assert_ne!(alice_pda, bob_pda);
}
