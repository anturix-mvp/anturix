import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useMemo } from "react";

/**
 * Custom hook to handle Privy authentication and Solana wallet access.
 */
export function useAuth() {
  const { login, logout, ready: privyReady, authenticated, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const ready = privyReady && walletsReady;
  const isAuthenticated = authenticated && Boolean(user);

  const solanaWalletFromPrivy = useMemo(
    () =>
      wallets.find(
        (wallet) =>
          Boolean(wallet?.address) &&
          typeof (wallet as any)?.signTransaction === "function",
      ) ??
      wallets.find((wallet) => Boolean(wallet?.address)) ??
      null,
    [wallets],
  );

  const injectedWallet = useMemo(() => {
    const injectedProvider =
      typeof window !== "undefined"
        ? ((window as any)?.phantom?.solana ?? (window as any)?.solana)
        : null;

    if (!(injectedProvider?.isPhantom && injectedProvider?.publicKey)) {
      return null;
    }

    return {
      address: injectedProvider.publicKey.toString(),
      publicKey: injectedProvider.publicKey,
      signTransaction: injectedProvider.signTransaction?.bind(injectedProvider),
      signAllTransactions:
        injectedProvider.signAllTransactions?.bind(injectedProvider),
      walletClientType: "phantom",
    };
  }, [ready, isAuthenticated]);

  const solanaWallet = useMemo(
    () => solanaWalletFromPrivy ?? injectedWallet,
    [solanaWalletFromPrivy, injectedWallet],
  );
  const walletReady =
    ready && isAuthenticated && Boolean(solanaWallet?.address);

  return {
    login,
    logout,
    ready,
    authenticated: isAuthenticated,
    user,
    solanaWallet,
    walletReady,
  };
}
