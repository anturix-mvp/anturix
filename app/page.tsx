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
import { useAnturixWeb3, ACTIVIDADES_ANTURIX } from "./lib/hooks/use-anturix-web3";

export default function Home() {
  const { wallet, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { xpLocal, nivelLocal, duelosGanados, participarEnActividad, txStatus, isSending, perfilData, initPerfil } = useAnturixWeb3();

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
          <span className="text-sm font-semibold tracking-tight">
            Solana Starter Kit
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ClusterSelect />
            <WalletButton />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6">
          {/* Hero */}
          <section className="pt-6 pb-20 md:pt-8 md:pb-32">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-black tracking-tight text-foreground">
                  <span className="block text-6xl md:text-7xl">Anchor</span>
                  <span className="block text-7xl md:text-8xl">Vault</span>
                </h1>
              </div>

              <div className="flex max-w-2xl flex-col gap-3">
                <p className="text-base leading-relaxed text-foreground/50">
                  This program creates a personal vault for each user using a
                  Program Derived Address (PDA). Connect your wallet, deposit
                  SOL into your vault, and withdraw it anytime. Only you can
                  access your funds.
                </p>
                <p className="text-sm leading-relaxed text-foreground/40">
                  The vault is an{" "}
                  <a
                    href="https://www.anchor-lang.com/docs/introduction"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Anchor
                  </a>{" "}
                  program you can deploy to localnet or devnet and modify
                  yourself. Check the README for setup instructions.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="https://solana.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Solana docs
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  <a
                    href="https://www.anchor-lang.com/docs/introduction"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Anchor docs
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Faucet
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Template content */}
          <div className="space-y-10 pb-20">
            {/* Wallet Balance */}
            {status === "connected" && address && (
              <section className="relative w-full overflow-hidden rounded-2xl border border-border-low bg-card px-5 py-5">
                <div
                  className="pointer-events-none absolute inset-0 opacity-100 dark:opacity-0"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
                    `,
                    backgroundSize: "24px 24px",
                    mask: "radial-gradient(ellipse 80% 80% at 50% 0%, black, transparent)",
                    WebkitMask:
                      "radial-gradient(ellipse 80% 80% at 50% 0%, black, transparent)",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-100"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
                    `,
                    backgroundSize: "24px 24px",
                    mask: "radial-gradient(ellipse 80% 80% at 50% 0%, black, transparent)",
                    WebkitMask:
                      "radial-gradient(ellipse 80% 80% at 50% 0%, black, transparent)",
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-foreground/70"
                      >
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Wallet Balance</span>
                    <button
                      onClick={handleCopy}
                      className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-muted transition hover:text-foreground"
                    >
                      {ellipsify(address, 4)}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                      >
                        {copied ? (
                          <path d="M20 6 9 17l-5-5" />
                        ) : (
                          <>
                            <rect
                              width="14"
                              height="14"
                              x="8"
                              y="8"
                              rx="2"
                              ry="2"
                            />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  {cluster !== "mainnet" && (
                    <button
                      onClick={handleAirdrop}
                      className="cursor-pointer rounded-lg border border-border-low px-3 py-1.5 text-xs font-medium transition hover:bg-cream"
                    >
                      Airdrop
                    </button>
                  )}
                </div>
                <p className="relative mt-4 font-mono text-4xl font-bold tabular-nums tracking-tight">
                  {balance.lamports != null
                    ? lamportsToSolString(balance.lamports)
                    : "\u2014"}
                  <span className="ml-1.5 text-lg font-normal text-muted">
                    SOL
                  </span>
                </p>
              </section>
            )}

            {/* Seccion de estadisticas simuladas de Anturix */}
            {status === "connected" && (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Nivel de Experto</p>
                  <p className="mt-2 text-3xl font-black">{nivelLocal}</p>
                  <p className="text-sm text-muted">XP Total: {xpLocal}</p>
                </div>
                <div className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Duelos Ganados</p>
                  <p className="mt-2 text-3xl font-black text-primary">{duelosGanados}</p>
                  <p className="text-sm text-muted">{perfilData ? "Perfil sincronizado" : "Sesion local"}</p>
                </div>
                <div className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Estado de Transaccion</p>
                  <p className="mt-2 text-sm font-medium truncate">{txStatus || "Esperando accion..."}</p>
                </div>
              </div>
            )}

            {/* Inicializacion de perfil si no existe en la blockchain */}
            {status === "connected" && !perfilData && (
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
                <h3 className="text-lg font-bold">Configura tu Perfil Anturix</h3>
                <p className="mt-1 text-sm text-muted">Aun no tienes un perfil registrado en Devnet para este wallet.</p>
                <button
                  onClick={initPerfil}
                  disabled={isSending}
                  className="mt-6 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {isSending ? "Inicializando..." : "Crear Perfil en Blockchain"}
                </button>
              </section>
            )}

            {/* Lista de actividades disponibles para simulacion */}
            {status === "connected" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Actividades Disponibles</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {ACTIVIDADES_ANTURIX.map((act) => (
                    <button
                      key={act.id}
                      disabled={isSending}
                      onClick={() => participarEnActividad(act)}
                      className="flex flex-col gap-4 rounded-2xl border border-border-low bg-card p-6 transition hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
                    >
                      <div className={`h-2 w-12 rounded-full ${act.color}`} />
                      <div className="text-left">
                        <p className="text-xs font-bold uppercase text-muted">{act.tipo}</p>
                        <p className="font-bold">{act.nombre}</p>
                        <p className="mt-2 text-sm font-medium text-primary">Stake: {act.stakeSol} SOL</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vault Program Section se mantiene comentado por errores */}
            {/* <VaultCard /> */}
          </div>
        </main>
      </div>
    </div>
  );
}