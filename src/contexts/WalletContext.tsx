import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

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
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    balance: 0,
    connecting: false,
    walletName: null,
  });
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [promptAction, setPromptAction] = useState<string | undefined>();

  // Auto-reconnect from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      connect(saved);
    }
  }, []);

  const connect = useCallback(async (walletName: string) => {
    setState(s => ({ ...s, connecting: true }));
    
    // Simulate wallet connection delay
    await new Promise(r => setTimeout(r, 1200));
    
    // Mock connection - in real app, use wallet adapter
    const mockPublicKey = 'Ax7f' + Math.random().toString(36).substring(2, 6).toUpperCase() + '...' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const mockBalance = Math.round((Math.random() * 100 + 5) * 100) / 100;
    
    setState({
      connected: true,
      publicKey: mockPublicKey,
      balance: mockBalance,
      connecting: false,
      walletName,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, walletName);
    }
    
    setShowConnectModal(false);
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      publicKey: null,
      balance: 0,
      connecting: false,
      walletName: null,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const signTransaction = useCallback(async (tx: unknown) => {
    await new Promise(r => setTimeout(r, 500));
    return tx;
  }, []);

  const requireWallet = useCallback((action?: string) => {
    if (state.connected) return true;
    setPromptAction(action);
    setShowConnectPrompt(true);
    return false;
  }, [state.connected]);

  return (
    <WalletContext.Provider value={{
      ...state,
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
