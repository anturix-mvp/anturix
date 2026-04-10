/**
 * Devnet smoke test for Anturix program.
 * Tests: init profile -> create duel -> accept -> resolve -> claim
 *
 * Usage: cd ~/anturix && npx tsx scripts/devnet-smoke-test.ts
 *
 * Requires:
 * - Program deployed to devnet
 * - ~/.config/solana/id.json with devnet SOL (used as admin + funder)
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  pipe,
  address,
  type Address,
  type TransactionSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  lamports,
  createKeyPairSignerFromBytes,
  getBase64EncodedWireTransaction,
} from "@solana/kit";

import {
  getInitUserProfileInstructionAsync,
  getCreateDuelInstructionAsync,
  getAcceptDuelInstructionAsync,
  getResolveDuelInstruction,
  getClaimPrizeInstructionAsync,
} from "../app/generated/anturix/instructions";

import { findUserProfilePda } from "../app/generated/anturix/pdas";

import { ANTURIX_PROGRAM_ADDRESS } from "../app/generated/anturix/programs";

import { readFileSync } from "fs";
import { homedir } from "os";

// -- Config --
const RPC_URL = "https://api.devnet.solana.com";
// const WSS_URL = "wss://api.devnet.solana.com";
const STAKE = 10_000_000n; // 0.01 SOL (minimum)
const EVENT_ID = "smoke-test-001";
const PREDICTION = "test prediction";

// -- Helpers --
const rpc = createSolanaRpc(RPC_URL);
// const rpcSub = createSolanaRpcSubscriptions(WSS_URL);

async function loadKeypairFromFile(path: string): Promise<TransactionSigner> {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const bytes = new Uint8Array(raw);
  return createKeyPairSignerFromBytes(bytes);
}

async function findPda(seeds: Uint8Array[]): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: ANTURIX_PROGRAM_ADDRESS,
    seeds,
  });
  return addr;
}

async function duelPda(creator: Address, duelCount: bigint): Promise<Address> {
  const encoder = getAddressEncoder();
  const countBytes = new Uint8Array(8);
  new DataView(countBytes.buffer).setBigUint64(0, duelCount, true);
  return findPda([
    new TextEncoder().encode("duel"),
    encoder.encode(creator),
    countBytes,
  ]);
}

async function escrowPda(duelState: Address): Promise<Address> {
  const encoder = getAddressEncoder();
  return findPda([
    new TextEncoder().encode("escrow"),
    encoder.encode(duelState),
  ]);
}

async function sendTx(
  instructions: any[],
  feePayer: TransactionSigner,
  signers?: TransactionSigner[],
) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(feePayer.address, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

  const signedTx = await signTransactionMessageWithSigners(msg);
  const sig = getSignatureFromTransaction(signedTx);

  const encodedTx = getBase64EncodedWireTransaction(signedTx);
  await rpc.sendTransaction(encodedTx, { encoding: "base64" }).send();

  // Poll for confirmation
  console.log(`  tx: ${sig.slice(0, 24)}...`);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await rpc.getSignatureStatuses([sig]).send();
    const val = status.value[0];
    if (val?.confirmationStatus === "confirmed" || val?.confirmationStatus === "finalized") {
      if (val.err) {
        throw new Error(`tx failed: ${JSON.stringify(val.err)}`);
      }
      console.log("  confirmed.");
      return sig;
    }
  }
  throw new Error("tx not confirmed after 30s");
  return sig;
}

async function fundFromAdmin(
  admin: TransactionSigner,
  to: Address,
  amount: bigint,
) {
  const transferIx = {
    programAddress: address("11111111111111111111111111111111"),
    accounts: [
      { address: admin.address, role: 3 as const, signer: admin }, // writable signer
      { address: to, role: 1 as const }, // writable
    ],
    data: (() => {
      const buf = new ArrayBuffer(12);
      const view = new DataView(buf);
      view.setUint32(0, 2, true); // system program transfer ix index
      view.setBigUint64(4, amount, true);
      return new Uint8Array(buf);
    })(),
  };

  await sendTx([transferIx as any], admin);
  console.log(`  funded ${to.slice(0, 8)}... with ${Number(amount) / 1e9} SOL`);
}

// -- Main --
async function main() {
  console.log("=== Anturix Devnet Smoke Test ===\n");
  console.log(`program: ${ANTURIX_PROGRAM_ADDRESS}`);

  // Load admin (dedicated admin keypair matching ADMIN_PUBKEY in constants.rs)
  const adminPath = `${__dirname}/../anchor/programs/anturix/tests/admin-keypair.json`;
  const admin = await loadKeypairFromFile(adminPath);
  console.log(`admin: ${admin.address}`);

  // Generate test wallets
  const alice = await generateKeyPairSigner();
  const bob = await generateKeyPairSigner();
  console.log(`alice: ${alice.address}`);
  console.log(`bob:   ${bob.address}\n`);

  // Load deployer wallet to fund test accounts
  const deployer = await loadKeypairFromFile(`${homedir()}/.config/solana/id.json`);
  console.log(`deployer: ${deployer.address}\n`);

  // Fund admin, alice, bob from deployer (0.05 SOL each)
  console.log("1. Funding test wallets from deployer...");
  await fundFromAdmin(deployer, admin.address, 50_000_000n);
  await fundFromAdmin(deployer, alice.address, 50_000_000n);
  await fundFromAdmin(deployer, bob.address, 50_000_000n);

  // Init profiles
  console.log("\n2. Initializing profiles...");
  const initAliceIx = await getInitUserProfileInstructionAsync({ owner: alice });
  await sendTx([initAliceIx], alice);

  const initBobIx = await getInitUserProfileInstructionAsync({ owner: bob });
  await sendTx([initBobIx], bob);

  // Create duel
  console.log("\n3. Alice creates duel (0.01 SOL stake)...");
  const duelAddr = await duelPda(alice.address, 0n);
  const escrowAddr = await escrowPda(duelAddr);
  console.log(`  duel PDA: ${duelAddr}`);
  console.log(`  escrow PDA: ${escrowAddr}`);

  const createDuelIx = await getCreateDuelInstructionAsync({
    creator: alice,
    duelState: duelAddr,
    eventId: EVENT_ID,
    prediction: PREDICTION,
    stakeAmount: STAKE,
    targetOpponent: null,
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
  });
  await sendTx([createDuelIx], alice);

  // Accept duel
  console.log("\n4. Bob accepts duel...");
  const acceptDuelIx = await getAcceptDuelInstructionAsync({
    opponent: bob,
    duelState: duelAddr,
  });
  await sendTx([acceptDuelIx], bob);

  // Resolve duel (admin declares alice winner)
  console.log("\n5. Admin resolves duel (alice wins)...");
  const [aliceProfile] = await findUserProfilePda({ owner: alice.address });
  const [bobProfile] = await findUserProfilePda({ owner: bob.address });
  const resolveDuelIx = getResolveDuelInstruction({
    admin,
    duelState: duelAddr,
    winnerProfile: aliceProfile,
    loserProfile: bobProfile,
    winner: alice.address,
  });
  await sendTx([resolveDuelIx], admin);

  // Claim prize
  console.log("\n6. Alice claims prize...");
  const claimIx = await getClaimPrizeInstructionAsync({
    winner: alice,
    duelState: duelAddr,
  });
  await sendTx([claimIx], alice);

  console.log("\n=== SMOKE TEST PASSED ===");
  console.log("Full duel lifecycle verified on devnet.");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n=== SMOKE TEST FAILED ===");
  console.error(err);
  process.exit(1);
});
