"use client";

import { useState, useEffect, useCallback } from "react";
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

const ANTURIX_PROGRAM_ADDRESS = "HiErQ1fFikbgqEMjDD58trMaZ8XHGtSmztEJu31UZA9" as Address;//chage when have program solana
const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;
const FEE_RECEPTOR = "6KpQ1wYFKf3ChQ2UxSVdLP58T1Hrv5aFuNxDA1tyKEKu" as Address; //this is my wallet chage
const rpc = createSolanaRpc("https://api.devnet.solana.com"); 

// Metadata de duelos y eventos para simulacion
export const ACTIVIDADES_ANTURIX = [
  { id: 'duel-1', nombre: 'Duelo Rapido: BTC vs ETH', tipo: 'Banter', xp: 200, stakeSol: "0.01", stakeLamports: 10000000n, color: 'bg-[#F2CC8F]' },
  { id: 'pool-1', nombre: 'Poker Pool Semanal', tipo: 'Pool', xp: 500, stakeSol: "0.05", stakeLamports: 50000000n, color: 'bg-[#81B29A]' },
  { id: 'lock-1', nombre: 'Prediccion: Sol 2026', tipo: 'Expert', xp: 1000, stakeSol: "0.1", stakeLamports: 100000000n, color: 'bg-[#3D405B]' },
];

export function useAnturixWeb3() {
  const { wallet, status, connect, disconnect, connectors } = useWallet();
  const { send, isSending } = useSendTransaction();
  const walletAddress = wallet?.account.address;
  
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [perfilData, setPerfilData] = useState<any>(null); 
  const [xpLocal, setXpLocal] = useState(0);
  const [nivelLocal, setNivelLocal] = useState(1);
  const [duelosGanados, setDuelosGanados] = useState(0);
  const [pdas, setPdas] = useState<{ profile: Address | null }>({ profile: null });

  // Deriva la direccion pda del perfil basada en la wallet
  useEffect(() => {
    async function deriveAddresses() {
      if (!walletAddress) return;
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
    deriveAddresses();
  }, [walletAddress]);

  // Lee el perfil desde la blockchain y sincroniza estados locales
  const fetchPerfilData = useCallback(async () => {
    if (!pdas.profile) return;
    try {
      const account = await fetchMaybeUserProfile(rpc, pdas.profile);
      if (account && account.exists) {
        setPerfilData(account.data); 
        setXpLocal(Number(account.data.banterWins) * 100); 
      } else {
        setPerfilData(null);
      }
    } catch (error) {
      console.error("Error leyendo perfil:", error);
    }
  }, [pdas.profile]);

  // Carga inicial y actualizacion por cambio de wallet
  useEffect(() => { fetchPerfilData(); }, [fetchPerfilData]);

  // Inicializa el perfil en la blockchain mediante una transaccion
  const initPerfil = useCallback(async () => {
    if (!walletAddress || !pdas.profile) return;
    try {
      setTxStatus("Firmando Inicializacion de Perfil Anturix...");
      const instruction = {
        programAddress: ANTURIX_PROGRAM_ADDRESS,
        accounts: [
          { address: walletAddress, role: 3 }, 
          { address: pdas.profile, role: 1 }, 
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: getInitUserProfileInstructionDataEncoder().encode({}),
      };
      const signature = await send({ instructions: [instruction] });
      setTxStatus(`Perfil Creado. TX: ${signature?.slice(0, 15)}...`);
      setTimeout(() => fetchPerfilData(), 3000); 
    } catch (err) {
      setTxStatus(`Error: ${err instanceof Error ? err.message : "Cancelado"}`);
    }
  }, [walletAddress, pdas, send, fetchPerfilData]);

  // Simula participacion y registra stakings reales en devnet
  const participarEnActividad = useCallback(async (actividad: typeof ACTIVIDADES_ANTURIX[0]) => {
    if (!walletAddress) return;
    try {
      setTxStatus(`Stake de ${actividad.stakeSol} SOL en proceso...`);
      
      const dataBuffer = new Uint8Array(12);
      const dataView = new DataView(dataBuffer.buffer);
      dataView.setUint32(0, 2, true); 
      dataView.setBigUint64(4, actividad.stakeLamports, true); 

      const transferInstruction = {
        programAddress: SYSTEM_PROGRAM_ADDRESS,
        accounts: [
          { address: walletAddress, role: 3 }, 
          { address: FEE_RECEPTOR, role: 1 }, 
        ],
        data: dataBuffer as any, 
      };

      const signature = await send({ instructions: [transferInstruction] });
      setTxStatus(`Actividad confirmada. TX: ${signature?.slice(0, 15)}...`);
      
      setXpLocal(prev => prev + actividad.xp);
      setDuelosGanados(prev => prev + 1);
      setNivelLocal(prev => Math.floor((xpLocal + actividad.xp) / 1000) + 1);

    } catch (err) {
      setTxStatus(`Error: ${err instanceof Error ? err.message : "Cancelado"}`);
    }
  }, [walletAddress, send, xpLocal]);

  return {
    wallet,
    status,
    connect,
    disconnect,
    connectors,
    isSending,
    txStatus,
    perfilData,
    xpLocal,      
    nivelLocal,
    duelosGanados,
    initPerfil,
    participarEnActividad
  };
}
