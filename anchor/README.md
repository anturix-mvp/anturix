# Anturix -- Solana Smart Contracts

On-chain program for Anturix, a gamified SocialFi prediction platform on Solana. Built with Anchor v1.0.0.

## Program ID

Deployed on **devnet**:

```
HiErQ1fFikbgqEMjDD58trMaZ8XHGtSmztEJu31UZA9
```

## Features

**Smart Banter (1v1 Duels)** -- Stake SOL, predict sports outcomes, loser gets a clown PFP for 24h.

**Expert Lock (Prediction Paywall)** -- Experts sell predictions via commit-reveal. Buyers pay a flat fee (direct P2P, no escrow). Gate: 3+ banter wins required.

**Poker Pool (Lobby)** -- 6-player Omaha lobby with buy-in escrow. MVP refunds all on close.

## Instructions (16 total)

| Feature | Instructions |
|---------|-------------|
| Shared | `init_user_profile` |
| Smart Banter | `create_duel`, `accept_duel`, `resolve_duel`, `claim_prize`, `cancel_duel`, `expire_cancel_duel`, `force_cancel_duel` |
| Expert Lock | `create_expert_lock`, `buy_expert_lock`, `reveal_expert_lock`, `resolve_expert_lock` |
| Poker Pool | `create_poker_pool`, `join_poker_pool`, `leave_poker_pool`, `close_poker_pool` |

## Account Structs

| Account | Size | PDA Seeds |
|---------|------|-----------|
| UserProfile | 81B | `["profile", owner]` |
| DuelState | 192B | `["duel", creator, duel_count_le_bytes]` |
| ExpertLockState | 160B | `["expert_lock", expert, event_id_bytes]` |
| PokerPool | 244B | `["poker", creator, pool_count_le_bytes]` |

Escrow PDAs are zero-data system-owned accounts (lamport bags):
- Duel escrow: `["escrow", duel_state]`
- Poker escrow: `["poker_escrow", poker_pool]`

## Building

```bash
anchor build
```

## Testing

50 LiteSVM tests across 5 test suites:

```bash
# Run all tests
cargo test --package anturix

# Run individual suites
cargo test --package anturix --test test_init_profile
cargo test --package anturix --test test_smart_banter
cargo test --package anturix --test test_expert_lock
cargo test --package anturix --test test_poker_pool
cargo test --package anturix --test test_integration
```

Tests require an admin keypair at `programs/anturix/tests/admin-keypair.json`. Generate one:

```bash
solana-keygen new --no-bip39-passphrase -o programs/anturix/tests/admin-keypair.json
```

Then update `ADMIN_PUBKEY` in `programs/anturix/src/constants.rs` to match:

```bash
solana-keygen pubkey programs/anturix/tests/admin-keypair.json
```

## Devnet Smoke Test

```bash
cd .. && npx tsx scripts/devnet-smoke-test.ts
```

Runs the full duel lifecycle on devnet: fund wallets, init profiles, create duel, accept, resolve, claim.

## Deploying

```bash
anchor deploy
```

After deploying, regenerate the TypeScript client:

```bash
cd .. && npm run codama:js
```

This updates `app/generated/anturix/` with typed instruction builders, account decoders, and PDA helpers.

## Architecture

Full architecture doc: `~/Brain/Projects/anturix/contract-architecture.md`

Key design decisions:
- Admin keypair for resolution (oracle post-hackathon)
- Escrow = system-owned PDA lamport bag, drained via invoke_signed
- Commit-reveal with secret salt for expert lock (SHA256 via sha2 crate)
- Clown duration fixed at 24h
- Prediction text stored off-chain (Prisma), only hash on-chain
- Account structs aggressively trimmed for rent
