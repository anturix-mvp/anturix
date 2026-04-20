import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer/";
import idl from "../../anchor/target/idl/anturix.json";
const DEVNET_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const sharedConnection = new Connection(DEVNET_RPC_URL, {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,
});
const ODDS_SCALE_BPS = 10_000;
const MIN_LOCKED_ODDS_BPS = 10_100;
const MAX_LOCKED_ODDS_BPS = 100_000;
const DEFAULT_START_ODDS_BPS = 20_000;

export interface PositionView {
  pubkey: string;
  side: "up" | "down";
  amountSol: number;
  lockedOdds: number;
  potentialPayoutSol: number;
  createdAt: number;
  claimed: boolean;
}

/**
 * Helper to initialize the Anchor Program instance.
 */
export function getProgram(wallet: any) {
  if (!wallet?.address && !(wallet?.publicKey instanceof PublicKey)) {
    throw new Error("No Solana wallet address found. Please log in again.");
  }

  if (typeof wallet?.signTransaction !== "function") {
    throw new Error("Wallet signer unavailable. Please reconnect your wallet.");
  }

  // Pivot wallet to match Anchor's expectation
  const anchorWallet = {
    publicKey:
      wallet.publicKey instanceof PublicKey
        ? wallet.publicKey
        : new PublicKey(wallet.address),
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  };

  const provider = new anchor.AnchorProvider(
    sharedConnection,
    anchorWallet as any,
    {
      preflightCommitment: "confirmed",
    },
  );

  return new anchor.Program(idl as any, provider);
}

/**
 * Creates a new duel on-chain.
 * Initializes the user profile if it doesn't exist.
 */
export async function createDuel(
  wallet: any,
  betAmountInSOL: number,
  mode: "private" | "public" = "private",
  side: "up" | "down" = "up",
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
  const priceFeedId = Buffer.alloc(32).fill(0);
  const targetPrice = new anchor.BN(50000);
  const condition = { above: {} };
  const stakeAmount = new anchor.BN(stakeLamports);
  const targetOpponent = null;
  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7);
  const lowerBound = new anchor.BN(0);
  const upperBound = new anchor.BN(0);
  const priceFeedIdB = Buffer.alloc(32).fill(0);

  // Map JS strings to Anchor Enums
  const anchorMode =
    mode === "private" ? { private1V1: {} } : { publicArena: {} };
  const anchorSide = side === "up" ? { up: {} } : { down: {} };

  console.log("Creating duel...", duelPda.toString(), mode, side);

  try {
    const createDuelData = program.coder.instruction.encode("createDuel", {
      priceFeedId: Array.from(priceFeedId),
      targetPrice,
      condition,
      stakeAmount,
      targetOpponent,
      expiresAt,
      lowerBound,
      upperBound,
      priceFeedIdB: Array.from(priceFeedIdB),
      mode: anchorMode,
      creatorSide: anchorSide,
    });

    const creatorTicket = PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        duelPda.toBuffer(),
        Buffer.from(new anchor.BN(0).toArray("le", 8)),
      ],
      program.programId,
    )[0];

    const createDuelIx = new TransactionInstruction({
      programId: program.programId,
      keys: [
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: duelPda, isSigner: false, isWritable: true },
        { pubkey: creatorTicket, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(createDuelData),
    });

    const createDuelTx = new Transaction().add(createDuelIx);
    await program.provider.sendAndConfirm(createDuelTx);
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
  side: "up" | "down" = "down",
  amountInSOL: number = 0,
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

  const duel = await program.account.duelState.fetch(duelPda);
  const nextTicketId = new anchor.BN(
    duel.nextTicketId ?? duel.next_ticket_id ?? 0,
  );
  const [ticketPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ticket"),
      duelPda.toBuffer(),
      Buffer.from(nextTicketId.toArray("le", 8)),
    ],
    program.programId,
  );

  console.log("Joining duel...", duelAccountPubkey, side, amountInSOL);

  const anchorSide = side === "up" ? { up: {} } : { down: {} };
  const amountLamports = new anchor.BN(Math.floor(amountInSOL * 1_000_000_000));

  // 4. Call accept_duel
  const acceptDuelData = program.coder.instruction.encode("acceptDuel", {
    side: anchorSide,
    amount: amountLamports,
  });

  const acceptDuelIx = new TransactionInstruction({
    programId: program.programId,
    keys: [
      { pubkey: opponent, isSigner: true, isWritable: true },
      { pubkey: profilePda, isSigner: false, isWritable: true },
      { pubkey: duelPda, isSigner: false, isWritable: true },
      { pubkey: ticketPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(acceptDuelData),
  });

  const acceptDuelTx = new Transaction().add(acceptDuelIx);
  await program.provider.sendAndConfirm(acceptDuelTx);
}

export async function claimTicket(
  wallet: any,
  duelAccountPubkey: string,
  ticketPubkey: string,
): Promise<void> {
  const program = getProgram(wallet);
  const owner = program.provider.publicKey!;
  const duelPda = new PublicKey(duelAccountPubkey);
  const ticketPda = new PublicKey(ticketPubkey);
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  await program.methods
    .claimTicket()
    .accounts({
      owner,
      duelState: duelPda,
      ticket: ticketPda,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
}

export async function getEntryQuote(
  wallet: any,
  duelAccountPubkey: string,
  side: "up" | "down",
  amountInSOL: number,
) {
  const program = getProgram(wallet);
  const duel = await program.account.duelState.fetch(
    new PublicKey(duelAccountPubkey),
  );

  const amountLamports = Math.floor(amountInSOL * 1_000_000_000);
  if (!Number.isFinite(amountLamports) || amountLamports <= 0) {
    return { odds: 0, payoutSol: 0 };
  }

  const poolUp = Number(
    duel.poolUpTotal?.toString?.() ?? duel.pool_up_total ?? 0,
  );
  const poolDown = Number(
    duel.poolDownTotal?.toString?.() ?? duel.pool_down_total ?? 0,
  );
  const lockedUp = Number(
    duel.lockedPayoutUpTotal?.toString?.() ?? duel.locked_payout_up_total ?? 0,
  );
  const lockedDown = Number(
    duel.lockedPayoutDownTotal?.toString?.() ??
      duel.locked_payout_down_total ??
      0,
  );

  const sidePool = side === "up" ? poolUp : poolDown;
  const totalPool = poolUp + poolDown;
  const escrowAfter = totalPool + amountLamports;
  const existingSideLiability = side === "up" ? lockedUp : lockedDown;
  const maxAdditionalLiability = Math.max(
    0,
    escrowAfter - existingSideLiability,
  );

  const baseOddsBps =
    sidePool === 0
      ? DEFAULT_START_ODDS_BPS
      : Math.max(
          MIN_LOCKED_ODDS_BPS,
          Math.min(
            MAX_LOCKED_ODDS_BPS,
            Math.floor((totalPool * ODDS_SCALE_BPS) / sidePool),
          ),
        );

  const maxOddsBps = Math.floor(
    (maxAdditionalLiability * ODDS_SCALE_BPS) / amountLamports,
  );
  const lockedOddsBps = Math.min(baseOddsBps, maxOddsBps);
  if (lockedOddsBps < MIN_LOCKED_ODDS_BPS) {
    return { odds: 0, payoutSol: 0 };
  }

  const payoutLamports = Math.floor(
    (amountLamports * lockedOddsBps) / ODDS_SCALE_BPS,
  );

  return {
    odds: lockedOddsBps / ODDS_SCALE_BPS,
    payoutSol: payoutLamports / 1_000_000_000,
  };
}

export async function getMyPositions(
  wallet: any,
  duelAccountPubkey: string,
): Promise<PositionView[]> {
  const program = getProgram(wallet);
  const duelPk = new PublicKey(duelAccountPubkey);
  const ownerPk =
    wallet?.publicKey instanceof PublicKey
      ? wallet.publicKey
      : new PublicKey(wallet.address);

  const tickets = await program.account.positionTicket.all([
    {
      memcmp: {
        offset: 8,
        bytes: duelPk.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 40,
        bytes: ownerPk.toBase58(),
      },
    },
  ]);

  return tickets
    .map((t: any) => {
      const side = t.account.side?.up ? "up" : "down";
      const amountLamports = Number(
        t.account.amount?.toString?.() ?? t.account.amount ?? 0,
      );
      const payoutLamports = Number(
        t.account.potentialPayout?.toString?.() ??
          t.account.potential_payout ??
          0,
      );
      const lockedOddsBps = Number(
        t.account.lockedOddsBps?.toString?.() ?? t.account.locked_odds_bps ?? 0,
      );

      return {
        pubkey: t.publicKey.toBase58(),
        side,
        amountSol: amountLamports / 1_000_000_000,
        lockedOdds: lockedOddsBps / ODDS_SCALE_BPS,
        potentialPayoutSol: payoutLamports / 1_000_000_000,
        createdAt: Number(
          t.account.createdAt?.toString?.() ?? t.account.created_at ?? 0,
        ),
        claimed: Boolean(t.account.claimed),
      } as PositionView;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
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
