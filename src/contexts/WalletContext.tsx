import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { Connection, PublicKey } from "@solana/web3.js";

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number;
  connecting: boolean;
  walletName: string | null;
}

interface WalletContextType extends WalletState {
  connect: (walletName: string) => Promise<void>;
  disconnect: () => void;
  signTransaction: (tx: unknown) => Promise<unknown>;
  showConnectPrompt: boolean;
  setShowConnectPrompt: (show: boolean) => void;
  showConnectModal: boolean;
  setShowConnectModal: (show: boolean) => void;
  showCreateBetModal: boolean;
  setShowCreateBetModal: (show: boolean) => void;
  createBetPreset: "standard" | "coinflip";
  setCreateBetPreset: (preset: "standard" | "coinflip") => void;
  openCreateBetModal: (preset?: "standard" | "coinflip") => void;
  requireWallet: (action?: string) => boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx)
    throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}

const STORAGE_KEY = "anturix_wallet_preference";
const DEVNET_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const walletConnection = new Connection(DEVNET_RPC_URL, {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { authenticated, solanaWallet, login, logout, ready } = useAuth();
  const [balance, setBalance] = useState(0);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showCreateBetModal, setShowCreateBetModal] = useState(false);
  const [createBetPreset, setCreateBetPreset] = useState<
    "standard" | "coinflip"
  >("standard");
  const [promptAction, setPromptAction] = useState<string | undefined>();

  const refreshBalance = useCallback(async (address: string) => {
    try {
      const lamports = await walletConnection.getBalance(
        new PublicKey(address),
      );
      setBalance(lamports / 1_000_000_000);
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, []);

  useEffect(() => {
    if (authenticated && solanaWallet?.address) {
      refreshBalance(solanaWallet.address);
      const interval = setInterval(
        () => refreshBalance(solanaWallet.address),
        30000,
      );
      return () => clearInterval(interval);
    } else {
      setBalance(0);
    }
  }, [authenticated, solanaWallet?.address, refreshBalance]);

  const connect = useCallback(async () => {
    login();
  }, [login]);

  const disconnect = useCallback(() => {
    logout();
  }, [logout]);

  const signTransaction = useCallback(
    async (tx: any) => {
      if (solanaWallet?.signTransaction) {
        return await solanaWallet.signTransaction(tx);
      }
      throw new Error("Wallet does not support signing");
    },
    [solanaWallet],
  );

  const requireWallet = useCallback(
    (action?: string) => {
      if (authenticated && solanaWallet) return true;
      setPromptAction(action);
      setShowConnectPrompt(true);
      return false;
    },
    [authenticated, solanaWallet],
  );

  const openCreateBetModal = useCallback(
    (preset: "standard" | "coinflip" = "standard") => {
      setCreateBetPreset(preset);
      setShowCreateBetModal(true);
    },
    [],
  );

  return (
    <WalletContext.Provider
      value={{
        connected: authenticated && !!solanaWallet,
        publicKey: solanaWallet?.address ?? null,
        balance,
        connecting: !ready,
        walletName: (solanaWallet as any)?.walletClientType ?? "Privy",
        connect,
        disconnect,
        signTransaction,
        showConnectPrompt,
        setShowConnectPrompt,
        showConnectModal,
        setShowConnectModal,
        showCreateBetModal,
        setShowCreateBetModal,
        createBetPreset,
        setCreateBetPreset,
        openCreateBetModal,
        requireWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
