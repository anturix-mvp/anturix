"use client";

import { useState } from "react";
import { lamports as sol } from "@solana/kit";
import { toast } from "sonner";
import { useWallet } from "./lib/wallet/context";
import { useBalance } from "./lib/hooks/use-balance";
import { lamportsToSolString } from "./lib/lamports";
import { useSolanaClient } from "./lib/solana-client-context";
import { ellipsify } from "./lib/explorer";
// import { VaultCard } from "./components/vault-card";
import { GridBackground } from "./components/grid-background";
import { ThemeToggle } from "./components/theme-toggle";
import { ClusterSelect } from "./components/cluster-select";
import { WalletButton } from "./components/wallet-button";
import { useCluster } from "./components/cluster-context";
import { useAnturixWeb3, ANTURIX_ACTIVITIES } from "./lib/hooks/use-anturix-web3";
import { StatsSection } from "./components/anturix/StatsSection";
import { ProfileSetup } from "./components/anturix/ProfileSetup";
import { ActivitiesList } from "./components/anturix/ActivitiesList";

export default function Home() {
  const { wallet, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { 
    localXp, 
    localLevel, 
    duelsWon, 
    participateInActivity, 
    txStatus, 
    isSending, 
    profileData, 
    initProfile 
  } = useAnturixWeb3();

  const address = wallet?.account.address;
  const balance = useBalance(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAirdrop = async () => {
    if (!address) return;
    try {
      toast.info("Requesting airdrop...");
      const sig = await client.airdrop(address, sol(1_000_000_000n));
      toast.success("Airdrop received!", {
        description: sig ? (
          <a
            href={getExplorerUrl(`/tx/${sig}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View transaction
          </a>
        ) : undefined,
      });
    } catch (err) {
      console.error("Airdrop failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimited =
        msg.includes("429") || msg.includes("Internal JSON-RPC error");
      toast.error(
        isRateLimited
          ? "Devnet faucet rate-limited. Use the web faucet instead."
          : "Airdrop failed. Try again later.",
        isRateLimited
          ? {
              description: (
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Open faucet.solana.com
                </a>
              ),
            }
          : undefined
      );
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GridBackground />

      <div className="relative z-10">
        {/* Header */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight uppercase opacity-50">
            Anturix SocialFi Hub
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ClusterSelect />
            <WalletButton />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6">
          {/* Hero Navigation */}
          <section className="pt-6 pb-20 md:pt-8 md:pb-32">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-black tracking-tight text-foreground">
                  <span className="block text-6xl md:text-7xl">Anturix</span>
                  <span className="block text-7xl md:text-8xl text-primary">Web3</span>
                </h1>
              </div>

              <div className="flex max-w-2xl flex-col gap-3">
                <p className="text-base leading-relaxed text-foreground/50">
                  Join the most competitive pocker ecosystem on Solana. 
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary underline underline-offset-4"
                  >
                    Whitepaper
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  <a
                    href="https://solana.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground/40 hover:text-foreground transition-colors"
                  >
                    Solana Docs
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Core Application Interface */}
          <div className="space-y-16 pb-24">
            {/* Wallet & Balance Overview */}
            {status === "connected" && address && (
              <section className="relative w-full overflow-hidden rounded-2xl border border-border-low bg-card p-6">
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-primary"
                      >
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-muted/60">Balance</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopy}
                          className="font-mono text-sm hover:text-primary transition-colors"
                        >
                          {ellipsify(address, 6)}
                        </button>
                      </div>
                    </div>
                  </div>
                  {cluster !== "mainnet" && (
                    <button
                      onClick={handleAirdrop}
                      className="rounded-lg bg-foreground/5 px-4 py-2 text-xs font-bold hover:bg-foreground/10 transition-colors"
                    >
                      Request Airdrop
                    </button>
                  )}
                </div>
                <p className="mt-4 font-mono text-5xl font-black tabular-nums tracking-tighter">
                  {balance.lamports != null
                    ? lamportsToSolString(balance.lamports)
                    : "0.00"}
                  <span className="ml-2 text-xl font-normal text-muted">SOL</span>
                </p>
              </section>
            )}

            {/* Simulated Statistics Dashboard */}
            {status === "connected" && (
              <StatsSection 
                localLevel={localLevel}
                localXp={localXp}
                duelsWon={duelsWon}
                txStatus={txStatus}
                profileData={profileData}
              />
            )}

            {/* Profile Guard/Setup Banner */}
            {status === "connected" && !profileData && (
              <ProfileSetup 
                initProfile={initProfile}
                isSending={isSending}
              />
            )}

            {/* Participation Grid */}
            {status === "connected" && (
              <ActivitiesList 
                activities={ANTURIX_ACTIVITIES}
                isSending={isSending}
                profileData={profileData}
                onParticipate={participateInActivity}
              />
            )}

            {/* Legacy Vault Reference - Kept commented out as requested */}
            {/* <VaultCard /> */}
          </div>
        </main>
      </div>
    </div>
  );
}