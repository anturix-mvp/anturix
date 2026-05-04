import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import idl from "../idl/anturix.json";
const DEVNET_RPC_URL =
  (import.meta as any).env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const sharedConnection = new Connection(DEVNET_RPC_URL, {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,
});
const ODDS_SCALE_BPS = 10_000;
const MIN_LOCKED_ODDS_BPS = 10_100;
const MAX_LOCKED_ODDS_BPS = 100_000;
const DEFAULT_START_ODDS_BPS = 20_000;

const SOL_USD_FEED_ID = Buffer.from(
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "hex",
);

function derivePositionPda(
  programId: PublicKey,
  duelStatePubkey: PublicKey,
  ownerPubkey: PublicKey,
  side: "OPTION_A" | "OPTION_B"
): PublicKey {
  const sideByte = side === "OPTION_A" ? 0 : 1;
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      duelStatePubkey.toBuffer(),
      ownerPubkey.toBuffer(),
      Buffer.from([sideByte]),
    ],
    programId
  )[0];
}

function deriveProfilePda(programId: PublicKey, ownerPubkey: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), ownerPubkey.toBuffer()],
    programId
  )[0];
}

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
      return [{ private: {} }, { Private: {} }, "private", "Private"];
    }
    return [{ public: {} }, { Public: {} }, "public", "Public"];
  }

  if (kind === "side") {
    return value === "up"
      ? [{ optionA: {} }, { OptionA: {} }, { option_a: {} }, "optionA", "OptionA", "option_a"]
      : [{ optionB: {} }, { OptionB: {} }, { option_b: {} }, "optionB", "OptionB", "option_b"];
  }

  const v = value.toLowerCase();
  const options: any[] = [];
  if (v === "odd") options.push({ odd: {} }, { Odd: {} }, "odd", "Odd");
  else if (v === "even") options.push({ even: {} }, { Even: {} }, "even", "Even");
  else if (v === "below") options.push({ below: {} }, { Below: {} }, "below", "Below");
  else if (v === "inrange") options.push({ inRange: {} }, { InRange: {} }, { in_range: {} }, "inRange", "InRange", "in_range");
  else if (v === "outofrange") options.push({ outOfRange: {} }, { OutOfRange: {} }, { out_of_range: {} }, "outOfRange", "OutOfRange", "out_of_range");
  else if (v === "assetrace") options.push({ assetRace: {} }, { AssetRace: {} }, { asset_race: {} }, "assetRace", "AssetRace", "asset_race");
  else options.push({ above: {} }, { Above: {} }, "above", "Above");
  return options;
}

function resolveCreateDuelEnums(
  program: anchor.Program,
  argsBase: {
    priceFeedId: any;
    targetPrice: anchor.BN;
    stakeAmount: anchor.BN;
    targetOpponent: PublicKey | null;
    expiresAt: anchor.BN;
    lowerBound: anchor.BN;
    upperBound: anchor.BN;
    priceFeedIdB: any;
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
        // Try both camelCase and snake_case for the instruction name
        for (const ixName of ["createDuel", "create_duel"]) {
          try {
            program.coder.instruction.encode(ixName, {
              visibility: resolvedMode,
              creator_side: resolvedSide,
              stake_amount: argsBase.stakeAmount,
              condition,
              price_feed_id: argsBase.priceFeedId,
              price_feed_id_b: argsBase.priceFeedIdB,
              target_price: argsBase.targetPrice,
              lower_bound: argsBase.lowerBound,
              upper_bound: argsBase.upperBound,
              expires_at: argsBase.expiresAt,
            });

            return { condition, mode: resolvedMode, side: resolvedSide };
          } catch (e: any) {
            // Also try camelCase keys just in case
            try {
              program.coder.instruction.encode(ixName, {
                visibility: resolvedMode,
                creatorSide: resolvedSide,
                stakeAmount: argsBase.stakeAmount,
                condition,
                priceFeedId: argsBase.priceFeedId,
                priceFeedIdB: argsBase.priceFeedIdB,
                targetPrice: argsBase.targetPrice,
                lowerBound: argsBase.lowerBound,
                upperBound: argsBase.upperBound,
                expiresAt: argsBase.expiresAt,
              });
              return { condition, mode: resolvedMode, side: resolvedSide };
            } catch (e2: any) {
              if (ixName === "create_duel") {
                console.error(`Encoding failed for ${ixName}:`, e2.message);
              }
            }
          }
        }
      }
    }
  }

  throw new Error(
    "Failed to resolve Anchor enum variant shapes for createDuel. Check console for details.",
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
    profile = await (program.account as any).userProfile.fetch(profilePda);
  } catch (e) {
    console.log("User profile not found, initializing...");
    try {
      await program.methods
        .initUserProfile()
        .accounts({
          owner: creator,
          userProfile: profilePda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("already been processed")) {
        const exists = await connection.getAccountInfo(profilePda);
        if (exists) return;
      }
      throw err;
    }

    // After init, fetch it to get correct state or assume default
    profile = { duelCount: new anchor.BN(0) };
  }

  // 3. Derive DuelState PDA using creator pubkey and their current duel count
  const duelCountBuf = (profile.duelCount ?? profile.duel_count ?? new anchor.BN(0));
  const [duelPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("duel"),
      creator.toBuffer(),
      duelCountBuf.toArrayLike(Buffer, "le", 8),
    ],
    program.programId,
  );

  // 4. Derive Escrow PDA
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  // 5. Build arguments for create_duel
  // Use real SOL/USD Pyth devnet feed ID to avoid InvalidFeedId error
  const priceFeedId = SOL_USD_FEED_ID;
  const targetPrice = new anchor.BN(50000);
  const stakeAmount = new anchor.BN(stakeLamports);

  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7);
  const lowerBound = new anchor.BN(0);
  const upperBound = new anchor.BN(0);
  const priceFeedIdB = Array.from(Buffer.alloc(32).fill(0));

  const sideEnum = side === "up" ? { optionA: {} } : { optionB: {} };
  const creatorPosition = derivePositionPda(
    program.programId,
    duelPda,
    creator,
    side === "up" ? "OPTION_A" : "OPTION_B"
  );

  console.log("[createDuel] Position PDA:", creatorPosition.toString());
  console.log("[createDuel] DuelState PDA:", duelPda.toString());
  console.log("[createDuel] Escrow PDA:", escrowPda.toString());
  console.log("[createDuel] Mode:", mode, "Side:", side);

  const resolvedEnums = resolveCreateDuelEnums(
    program,
    {
      priceFeedId,
      targetPrice,
      stakeAmount,
      targetOpponent: null,
      expiresAt,
      lowerBound,
      upperBound,
      priceFeedIdB: Buffer.from(priceFeedIdB),
    },
    mode,
    side,
    conditionStr,
  );

  // 7. Check if duel already exists (handles race conditions/retries)
  const duelInfo = await connection.getAccountInfo(duelPda);
  if (duelInfo) {
    console.log("[createDuel] Duel account already exists, assuming success.");
    return duelPda.toString();
  }

  // 8. Call create_duel via methods builder
  try {
    const tx = await program.methods
      .createDuel(
        resolvedEnums.mode,
        sideEnum,
        stakeAmount,
        resolvedEnums.condition,
        priceFeedId,
        Buffer.from(priceFeedIdB),
        targetPrice,
        lowerBound,
        upperBound,
        expiresAt,
      )
      .accounts({
        creator,
        creatorProfile: profilePda,
        duelState: duelPda,
        creatorPosition,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([])
      .rpc();

    console.log("Duel created. Transaction:", tx);
  } catch (error: any) {
    const message = String(error?.message || "");

    // If transaction already processed, check if account exists now
    if (message.includes("already been processed")) {
      const exists = await connection.getAccountInfo(duelPda);
      if (exists) {
        console.log("[createDuel] Transaction reported as already processed, but duel exists. Continuing.");
        return duelPda.toString();
      }
    }

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
 * Joins an existing duel on-chain via join_pool instruction.
 */
export async function joinDuel(
  wallet: any,
  duelAccountPubkey: string,
  side: "up" | "down" = "down",
  amountInSOL: number = 0,
): Promise<void> {
  const program = getProgram(wallet);
  const participant = program.provider.publicKey!;
  const duelPda = new PublicKey(duelAccountPubkey);

  // 1. Derive UserProfile PDA for the participant
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), participant.toBuffer()],
    program.programId,
  );

  // 2. Ensure participant has a profile
  try {
    await (program.account as any).userProfile.fetch(profilePda);
  } catch (e) {
    console.log("Participant profile not found, initializing...");
    await program.methods
      .initUserProfile()
      .accounts({
        owner: participant,
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

  // 4. Derive Position PDA
  const sideKey = side === "up" ? "OPTION_A" : "OPTION_B";
  const positionPda = derivePositionPda(
    program.programId,
    duelPda,
    participant,
    sideKey
  );

  const anchorSide = side === "up" ? { optionA: {} } : { optionB: {} };
  const amountLamports = new anchor.BN(Math.floor(amountInSOL * 1_000_000_000));

  // 5. Check if position already exists (handles retries)
  const positionInfo = await connection.getAccountInfo(positionPda);
  if (positionInfo) {
    console.log("[joinDuel] Position account already exists, assuming success.");
    return;
  }

  try {
    const tx = await program.methods
      .joinPool(anchorSide, amountLamports)
      .accounts({
        participant,
        participantProfile: profilePda,
        duelState: duelPda,
        participantPosition: positionPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Duel joined. Transaction:", tx);
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.includes("already been processed")) {
      const exists = await connection.getAccountInfo(positionPda);
      if (exists) {
        console.log("[joinDuel] Transaction reported as already processed, but position exists. Continuing.");
        return;
      }
    }
    console.error("Join failure:", error);
    throw error;
  }
}

/**
 * Claims the winner's share from a resolved duel.
 * Use this when duel status = Resolved AND user is on the winning side.
 */
export async function claimShare(
  wallet: any,
  duelAccountPubkey: string,
  _unusedPositionPubkey: string,
  side: "up" | "down",
): Promise<void> {
  const program = getProgram(wallet);
  const owner = program.provider.publicKey!;
  const duelPda = new PublicKey(duelAccountPubkey);

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), owner.toBuffer()],
    program.programId,
  );

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  const anchorSide = side === "up" ? { optionA: {} } : { optionB: {} };

    const positionPda = derivePositionPda(
      program.programId,
      duelPda,
      owner,
      side === "up" ? "OPTION_A" : "OPTION_B"
    );

    try {
      await program.methods
        .claimShare(anchorSide)
        .accounts({
          owner,
          ownerProfile: profilePda,
          duelState: duelPda,
          position: positionPda,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("already been processed")) {
        console.log("[claimShare] Transaction reported as already processed. Continuing.");
        return;
      }
      throw error;
    }
}

/**
 * Claims a refund from a cancelled duel.
 * Use this when duel status = Cancelled.
 */
export async function claimRefund(
  wallet: any,
  duelAccountPubkey: string,
  _unusedPositionPubkey: string,
  side: "up" | "down",
): Promise<void> {
  const program = getProgram(wallet);
  const owner = program.provider.publicKey!;
  const duelPda = new PublicKey(duelAccountPubkey);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), duelPda.toBuffer()],
    program.programId,
  );

  const anchorSide = side === "up" ? { optionA: {} } : { optionB: {} };

    const positionPda = derivePositionPda(
      program.programId,
      duelPda,
      owner,
      side === "up" ? "OPTION_A" : "OPTION_B"
    );

    try {
      await program.methods
        .claimRefund(anchorSide)
        .accounts({
          owner,
          duelState: duelPda,
          position: positionPda,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("already been processed")) {
        console.log("[claimRefund] Transaction reported as already processed. Continuing.");
        return;
      }
      throw error;
    }
}

export async function getEntryQuote(
  wallet: any,
  duelAccountPubkey: string,
  side: "up" | "down",
  amountInSOL: number,
) {
  const program = getProgram(wallet);
  const duel = await (program.account as any).duelState.fetch(
    new PublicKey(duelAccountPubkey),
  );

  const amountLamports = Math.floor(amountInSOL * 1_000_000_000);
  if (!Number.isFinite(amountLamports) || amountLamports <= 0) {
    return { odds: 0, payoutSol: 0 };
  }

  const poolUp = Number(
    duel.sideATotal?.toString?.() ?? duel.side_a_total ?? 0,
  );
  const poolDown = Number(
    duel.sideBTotal?.toString?.() ?? duel.side_b_total ?? 0,
  );

  const sidePool = side === "up" ? poolUp : poolDown;
  const totalPool = poolUp + poolDown;
  const escrowAfter = totalPool + amountLamports;

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
    (escrowAfter * ODDS_SCALE_BPS) / amountLamports,
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

  // IDL struct name is "Position" (not "PositionTicket")
  const accountName = (program.account as any).position
    ? "position"
    : "positionTicket";

  const positions = await (program.account as any)[accountName].all([
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

  return positions
    .map((t: any) => {
      const side = (t.account.side?.optionA || t.account.side?.OptionA) ? "up" : "down";
      const stakeLamports = Number(
        t.account.stake?.toString?.() ?? t.account.amount?.toString?.() ?? 0,
      );

      return {
        pubkey: t.publicKey.toBase58(),
        side,
        amountSol: stakeLamports / 1_000_000_000,
        lockedOdds: 2.0, // Fixed 2x for private duels
        potentialPayoutSol: (stakeLamports * 2) / 1_000_000_000,
        createdAt: 0,
        claimed: false,
      } as PositionView;
    });
}

/**
 * Fetches the current state of a duel account.
 */
export async function getDuelAccount(wallet: any, duelAccountPubkey: string) {
  try {
    const program = getProgram(wallet);
    const duelPda = new PublicKey(duelAccountPubkey);
    return await (program.account as any).duelState.fetch(duelPda);
  } catch (e) {
    console.error("Error fetching duel account:", e);
    return null;
  }
}

/**
 * Creator cancels a pending duel.
 * IDL only accepts 2 accounts: creator + duel_state.
 * To get SOL back after cancellation, call claimRefund() separately.
 */
export async function cancelDuel(wallet: any, duelAccountPubkey: string) {
  const program = getProgram(wallet);
  const creator = program.provider.publicKey!;
  const duelPda = new PublicKey(duelAccountPubkey);

  try {
    const tx = await program.methods
      .cancelDuel()
      .accounts({
        creator,
        duelState: duelPda,
      } as any)
      .rpc();

    console.log("Duel cancelled. Transaction:", tx);
  } catch (error: any) {
    console.error("Cancel failure:", error);
    throw error;
  }
}
