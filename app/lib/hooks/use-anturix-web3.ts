"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { 
  getProgramDerivedAddress, 
  getAddressEncoder, 
  getBytesEncoder, 
  createSolanaRpc, 
  type Address 
} from "@solana/kit";
import { useWallet } from "../wallet/context";
import { useSendTransaction } from "./use-send-transaction";
import { fetchMaybeUserProfile } from "../../generated/anturix/accounts"; 
import { getInitUserProfileInstructionDataEncoder } from "../../generated/anturix/instructions";

const ANTURIX_PROGRAM_ADDRESS = "HiErQ1fFikbgqEMjDD58trMaZ8XHGtSmztEJu31UZA9" as Address;
const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;
const COMPUTE_BUDGET_PROGRAM_ADDRESS = "ComputeBudget111111111111111111111111111111" as Address;
const FEE_RECEPTOR = "6KpQ1wYFKf3ChQ2UxSVdLP58T1Hrv5aFuNxDA1tyKEKu" as Address;
const rpc = createSolanaRpc("https://api.devnet.solana.com"); 

// Metadata for ecosystem activities
export const ANTURIX_ACTIVITIES = [
  { id: 'duel-1', name: 'Quick Duel: BTC vs ETH', type: 'Banter', xp: 200, stakeSol: "0.01", stakeLamports: 10000000n, color: 'bg-[#F2CC8F]' },
  { id: 'pool-1', name: 'Weekly Poker Pool', type: 'Pool', xp: 500, stakeSol: "0.05", stakeLamports: 50000000n, color: 'bg-[#81B29A]' },
  { id: 'lock-1', name: 'Prediction: Sol 2026', type: 'Expert', xp: 1000, stakeSol: "0.1", stakeLamports: 100000000n, color: 'bg-[#3D405B]' },
];

export function useAnturixWeb3() {
  const { wallet, status } = useWallet();
  const { send, isSending } = useSendTransaction();
  const walletAddress = wallet?.account.address;
  
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [localXp, setLocalXp] = useState(0);
  const [duelsWon, setDuelsWon] = useState(0);
  const [pdas, setPdas] = useState<{ profile: Address | null }>({ profile: null });

  // Stabilize compute budget instruction for complex profile initialization
  const computeBudgetInstruction = useMemo(() => ({
    programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
    accounts: [],
    data: new Uint8Array([2, 128, 26, 6, 0]), 
  }), []);

  // Derive profile PDA only when the wallet address changes
  useEffect(() => {
    if (!walletAddress) {
      setPdas({ profile: null });
      return;
    }
    async function derive() {
      const encoder = getBytesEncoder();
      const addrEncoder = getAddressEncoder();
      const [profilePda] = await getProgramDerivedAddress({
        programAddress: ANTURIX_PROGRAM_ADDRESS,
        seeds: [
          encoder.encode(new Uint8Array([112, 114, 111, 102, 105, 108, 101])),
          addrEncoder.encode(walletAddress),
        ],
      });
      setPdas({ profile: profilePda });
    }
    derive();
  }, [walletAddress]);

  // Use SWR for efficient fetching, caching, and deduping of profile data
  const { data: profileAccount, mutate: mutateProfile } = useSWR(
    pdas.profile ? ["anturix-profile", pdas.profile] : null,
    async ([, profileAddr]) => {
      const account = await fetchMaybeUserProfile(rpc, profileAddr as Address);
      return (account && account.exists) ? account.data : null;
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  // Synchronize local experience with on-chain profile data
  useEffect(() => {
    if (profileAccount) {
      setLocalXp(Number(profileAccount.banterWins) * 100);
    }
  }, [profileAccount]);

  const localLevel = useMemo(() => Math.floor(localXp / 1000) + 1, [localXp]);

  const initProfile = useCallback(async () => {
    if (!walletAddress || !pdas.profile) return;
    try {
      if (profileAccount) {
        setTxStatus("Error: Profile already initialized!");
        return;
      }

      setTxStatus("Requesting Profile Initialization...");
      const mainInstruction = {
        programAddress: ANTURIX_PROGRAM_ADDRESS,
        accounts: [
          { address: walletAddress, role: 3 }, 
          { address: pdas.profile, role: 1 }, 
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: getInitUserProfileInstructionDataEncoder().encode({}),
      };
      
      // Compute budget IS required for custom program initialization
      const signature = await send({ instructions: [computeBudgetInstruction, mainInstruction] });
      if (signature) {
        setTxStatus(`Profile Initialized. TX: ${signature.slice(0, 15)}...`);
        setTimeout(() => mutateProfile(), 3000); 
      }
    } catch (err: any) {
      const msg = err.message || "Simulation failed";
      const cause = err.cause?.message || "Unknown reason";
      setTxStatus(`Error: ${msg} (${cause})`);
    }
  }, [walletAddress, pdas.profile, send, mutateProfile, computeBudgetInstruction, profileAccount]);

  const participateInActivity = useCallback(async (activity: typeof ANTURIX_ACTIVITIES[0]) => {
    if (!walletAddress) return;
    if (!profileAccount) {
      setTxStatus("Error: You must create a profile first!");
      return;
    }

    try {
      setTxStatus(`Participating in ${activity.name}...`);
      const dataBuffer = new Uint8Array(12);
      const dataView = new DataView(dataBuffer.buffer);
      dataView.setUint32(0, 2, true); 
      dataView.setBigUint64(4, activity.stakeLamports, true); 

      const transferInstruction = {
        programAddress: SYSTEM_PROGRAM_ADDRESS,
        accounts: [
          { address: walletAddress, role: 3 }, 
          { address: FEE_RECEPTOR, role: 1 }, 
        ],
        data: dataBuffer as any, 
      };

      // Simple SOL transfers do NOT need a compute budget instruction
      const signature = await send({ instructions: [transferInstruction] });
      if (signature) {
        setTxStatus(`Activity confirmed. TX: ${signature.slice(0, 15)}...`);
        setLocalXp(prev => prev + activity.xp);
        setDuelsWon(prev => prev + 1);
      }
    } catch (err: any) {
      const msg = err.message || "Simulation failed";
      const cause = err.cause?.message || "Check your Devnet balance";
      setTxStatus(`Error: ${msg} (${cause})`);
    }
  }, [walletAddress, send, profileAccount]);

  return {
    wallet,
    status,
    isSending,
    txStatus,
    profileData: profileAccount,
    localXp,      
    localLevel,
    duelsWon,
    initProfile,
    participateInActivity
  };
}
