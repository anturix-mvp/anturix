import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Connection, PublicKey } from '@solana/web3.js';


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
  requireWallet: (action?: string) => boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}

const STORAGE_KEY = 'anturix_wallet_preference';

export function WalletProvider({ children }: { children: ReactNode }) {
  const { authenticated, solanaWallet, login, logout, ready } = useAuth();
  const [balance, setBalance] = useState(0);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [promptAction, setPromptAction] = useState<string | undefined>();

  const refreshBalance = useCallback(async (address: string) => {
    try {
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const lamports = await connection.getBalance(new PublicKey(address));
      setBalance(lamports / 1_000_000_000);
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    }
  }, []);

  useEffect(() => {
    if (authenticated && solanaWallet?.address) {
      refreshBalance(solanaWallet.address);
      const interval = setInterval(() => refreshBalance(solanaWallet.address), 30000);
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

  const signTransaction = useCallback(async (tx: any) => {
    if (solanaWallet?.signTransaction) {
      return await solanaWallet.signTransaction(tx);
    }
    throw new Error('Wallet does not support signing');
  }, [solanaWallet]);

  const requireWallet = useCallback((action?: string) => {
    if (authenticated && solanaWallet) return true;
    setPromptAction(action);
    setShowConnectPrompt(true);
    return false;
  }, [authenticated, solanaWallet]);

  return (
    <WalletContext.Provider value={{
      connected: authenticated && !!solanaWallet,
      publicKey: solanaWallet?.address ?? null,
      balance,
      connecting: !ready,
      walletName: (solanaWallet as any)?.walletClientType ?? 'Privy',
      connect,
      disconnect,
      signTransaction,
      showConnectPrompt,
      setShowConnectPrompt,
      showConnectModal,
      setShowConnectModal,
      requireWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

