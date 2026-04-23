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

function enumCandidates(kind: "mode" | "side" | "condition", value: string) {
  if (kind === "mode") {
    if (value === "private") {
      return [
        { private1v1: {} },
        { private1V1: {} },
        { Private1v1: {} },
        { Private1V1: {} },
      ];
    }
    return [{ publicArena: {} }, { PublicArena: {} }];
  }

  if (kind === "side") {
    return value === "up"
      ? [{ up: {} }, { Up: {} }]
      : [{ down: {} }, { Down: {} }];
  }

  if (value === "odd") return [{ odd: {} }, { Odd: {} }];
  if (value === "even") return [{ even: {} }, { Even: {} }];
  return [{ above: {} }, { Above: {} }];
}

function resolveCreateDuelEnums(
  program: anchor.Program,
  argsBase: {
    priceFeedId: number[];
    targetPrice: anchor.BN;
    stakeAmount: anchor.BN;
    targetOpponent: PublicKey | null;
    expiresAt: anchor.BN;
    lowerBound: anchor.BN;
    upperBound: anchor.BN;
    priceFeedIdB: number[];
  },
  mode: "private" | "public",
  side: "up" | "down",
  conditionStr: string,
) {
  const modeOptions = enumCandidates("mode", mode);
  const sideOptions = enumCandidates("side", side);
  const conditionOptions = enumCandidates("condition", conditionStr);

  for (const condition of conditionOptions) {
    for (const resolvedMode of modeOptions) {
      for (const resolvedSide of sideOptions) {
        try {
          program.coder.instruction.encode("createDuel", {
            priceFeedId: argsBase.priceFeedId,
            targetPrice: argsBase.targetPrice,
            condition,
            stakeAmount: argsBase.stakeAmount,
            targetOpponent: argsBase.targetOpponent,
            expiresAt: argsBase.expiresAt,
            lowerBound: argsBase.lowerBound,
            upperBound: argsBase.upperBound,
            priceFeedIdB: argsBase.priceFeedIdB,
            mode: resolvedMode,
            creatorSide: resolvedSide,
          });

          return { condition, mode: resolvedMode, side: resolvedSide };
        } catch {
          // Try next candidate combination.
        }
      }
    }
  }

  throw new Error(
    "Failed to resolve Anchor enum variant shapes for createDuel",
  );
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
  conditionStr: string = "above",
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
  const stakeAmount = new anchor.BN(stakeLamports);
  const targetOpponent: PublicKey | null = null;

  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7);
  const lowerBound = new anchor.BN(0);
  const upperBound = new anchor.BN(0);
  const priceFeedIdB = Buffer.alloc(32).fill(0);

  const [creatorTicket] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ticket"),
      duelPda.toBuffer(),
      new anchor.BN(0).toArrayLike(Buffer, "le", 8),
    ],
    program.programId,
  );

  const resolvedEnums = resolveCreateDuelEnums(
    program,
    {
      priceFeedId: Array.from(priceFeedId),
      targetPrice,
      stakeAmount,
      targetOpponent,
      expiresAt,
      lowerBound,
      upperBound,
      priceFeedIdB: Array.from(priceFeedIdB),
    },
    mode,
    side,
    conditionStr,
  );

  // 5. Call create_duel via methods builder
  console.log("Creating duel...", duelPda.toString(), mode, side);

  try {
    const tx = await program.methods
      .createDuel(
        Array.from(priceFeedId),
        targetPrice,
        resolvedEnums.condition,
        stakeAmount,
        targetOpponent,
        expiresAt,
        lowerBound,
        upperBound,
        Array.from(priceFeedIdB),
        resolvedEnums.mode,
        resolvedEnums.side,
      )
      .accounts({
        creator,
        creatorProfile: profilePda,
        duelState: duelPda,
        creatorTicket,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Duel created. Transaction:", tx);
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

  const sideOptions = enumCandidates("side", side);
  let anchorSide = sideOptions[0];
  if (sideOptions.length > 1) {
    try {
      program.coder.instruction.encode("acceptDuel", {
        side: sideOptions[0],
        amount: new anchor.BN(1),
      });
    } catch {
      anchorSide = sideOptions[1];
    }
  }

  const amountLamports = new anchor.BN(Math.floor(amountInSOL * 1_000_000_000));

  // 4. Call accept_duel via methods builder
  try {
    const tx = await program.methods
      .acceptDuel(anchorSide, amountLamports)
      .accounts({
        opponent,
        opponentProfile: profilePda,
        duelState: duelPda,
        ticket: ticketPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Duel joined. Transaction:", tx);
  } catch (error: any) {
    console.error("Join failure:", error);
    throw error;
  }
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

/**
 * Creator cancels a pending duel.
 */
export async function cancelDuel(wallet: any, duelAccountPubkey: string) {
  const provider = getProvider(wallet);
  const program = getProgram(provider);
  const creator = provider.publicKey;
  const duelPda = new PublicKey(duelAccountPubkey);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  try {
    const tx = await program.methods
      .cancelDuel()
      .accounts({
        creator,
        duelState: duelPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Duel cancelled. Transaction:", tx);
  } catch (error: any) {
    console.error("Cancel failure:", error);
    throw error;
  }
}

/**
 * Refund an expired unmatched duel.
 */
export async function expireCancelDuel(wallet: any, duelAccountPubkey: string) {
  const provider = getProvider(wallet);
  const program = getProgram(provider);
  const caller = provider.publicKey;
  const duelPda = new PublicKey(duelAccountPubkey);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  try {
    const tx = await program.methods
      .expireCancelDuel()
      .accounts({
        caller,
        duelState: duelPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Expire refund completed. Transaction:", tx);
  } catch (error: any) {
    console.error("Expire refund failure:", error);
    throw error;
  }
}
