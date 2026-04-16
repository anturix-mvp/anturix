import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../../anchor/target/idl/anturix.json";

// The Program ID from the IDL/Anchor.toml
const PROGRAM_ID = new PublicKey("HiErQ1fFikbgqEMjDD58trMaZ8XHGtSmztEJu31UZA9");

/**
 * Helper to initialize the Anchor Program instance.
 */
export function getProgram(wallet: any) {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );

  if (!wallet?.address && !(wallet?.publicKey instanceof PublicKey)) {
    throw new Error("No Solana wallet address found. Please log in again.");
  }

  if (typeof wallet?.signTransaction !== "function") {
    throw new Error("Wallet signer unavailable. Please reconnect your wallet.");
  }

  // Pivot wallet to match Anchor's expectation if it's not already a direct match
  const anchorWallet = {
    publicKey:
      wallet.publicKey instanceof PublicKey
        ? wallet.publicKey
        : new PublicKey(wallet.address),
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  };

  const provider = new anchor.AnchorProvider(connection, anchorWallet as any, {
    preflightCommitment: "confirmed",
  });

  return new anchor.Program(idl as any, provider);
}

/**
 * Creates a new duel on-chain.
 * Initializes the user profile if it doesn't exist.
 */
export async function createDuel(
  wallet: any,
  betAmountInSOL: number,
): Promise<string> {
  const program = getProgram(wallet);
  const creator = program.provider.publicKey!;
  const connection = program.provider.connection;

  // Fast-fail before simulation when user has no Devnet SOL.
  const creatorBalanceLamports = await connection.getBalance(
    creator,
    "confirmed",
  );
  const stakeLamports = Math.floor(betAmountInSOL * 1_000_000_000);
  const feeAndRentBufferLamports = Math.floor(0.02 * 1_000_000_000);
  const minimumRequiredLamports = stakeLamports + feeAndRentBufferLamports;

  if (creatorBalanceLamports < minimumRequiredLamports) {
    const balanceSol = (creatorBalanceLamports / 1_000_000_000).toFixed(4);
    const neededSol = (minimumRequiredLamports / 1_000_000_000).toFixed(4);
    throw new Error(
      `Insufficient Devnet SOL. Balance ${balanceSol} SOL, need at least ${neededSol} SOL. In Phantom, switch to Devnet and request an airdrop from https://faucet.solana.com.`,
    );
  }

  // 1. Derive UserProfile PDA
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), creator.toBuffer()],
    program.programId,
  );

  // 2. Check if UserProfile exists, if not initialize it
  let profile: any;
  try {
    profile = await program.account.userProfile.fetch(profilePda);
  } catch (e) {
    console.log("User profile not found, initializing...");
    await program.methods
      .initUserProfile()
      .accounts({
        owner: creator,
        userProfile: profilePda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // After init, fetch it to get correct state or assume default
    profile = { duelCount: new anchor.BN(0) };
  }

  // 3. Derive DuelState PDA using creator pubkey and their current duel count
  const [duelPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("duel"),
      creator.toBuffer(),
      profile.duelCount.toArrayLike(Buffer, "le", 8),
    ],
    program.programId,
  );

  // 4. Derive Escrow PDA
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  // 5. Build arguments for create_duel
  // Args: price_feed_id, target_price, condition, stake_amount, target_opponent, expires_at, lower_bound, upper_bound, price_feed_id_b
  const priceFeedId = Array(32).fill(0);
  const targetPrice = new anchor.BN(50000); // Dummy target
  const condition = { above: {} }; // Enum: Above
  const stakeAmount = new anchor.BN(stakeLamports); // SOL to Lamports
  const targetOpponent = null;
  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7); // 7 days from now
  const lowerBound = new anchor.BN(0);
  const upperBound = new anchor.BN(0);
  const priceFeedIdB = Array(32).fill(0);

  console.log("Creating duel...", duelPda.toString());

  try {
    await program.methods
      .createDuel(
        priceFeedId,
        targetPrice,
        condition,
        stakeAmount,
        targetOpponent,
        expiresAt,
        lowerBound,
        upperBound,
        priceFeedIdB,
      )
      .accounts({
        creator,
        creatorProfile: profilePda,
        duelState: duelPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
  } catch (error: any) {
    const message = String(error?.message || "");
    if (
      message.includes(
        "Attempt to debit an account but found no record of a prior credit",
      )
    ) {
      throw new Error(
        "Your wallet has no spendable Devnet SOL. Switch Phantom to Devnet and fund this address from https://faucet.solana.com, then retry.",
      );
    }

    throw error;
  }

  return duelPda.toString();
}

/**
 * Joins an existing duel on-chain.
 */
export async function joinDuel(
  wallet: any,
  duelAccountPubkey: string,
): Promise<void> {
  const program = getProgram(wallet);
  const opponent = program.provider.publicKey!;
  const duelPda = new PublicKey(duelAccountPubkey);

  // 1. Derive UserProfile PDA for the opponent
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), opponent.toBuffer()],
    program.programId,
  );

  // 2. Ensure opponent has a profile
  try {
    await program.account.userProfile.fetch(profilePda);
  } catch (e) {
    console.log("Opponent profile not found, initializing...");
    await program.methods
      .initUserProfile()
      .accounts({
        owner: opponent,
        userProfile: profilePda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
  }

  // 3. Derive Escrow PDA
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  console.log("Joining duel...", duelAccountPubkey);

  // 4. Call accept_duel
  await program.methods
    .acceptDuel()
    .accounts({
      opponent,
      opponentProfile: profilePda,
      duelState: duelPda,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
}

/**
 * Fetches the current state of a duel account.
 */
export async function getDuelAccount(wallet: any, duelAccountPubkey: string) {
  try {
    const program = getProgram(wallet);
    const duelPda = new PublicKey(duelAccountPubkey);
    return await program.account.duelState.fetch(duelPda);
  } catch (e) {
    console.error("Error fetching duel account:", e);
    return null;
  }
}
