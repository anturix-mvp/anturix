import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CreateBetModal } from "@/components/bet/CreateBetModal";
import { CoinFlipModal } from "@/components/CoinFlipModal";
import { Swords, Zap, Share2, Shield, ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  loadRecentDuel,
  type RecentDuel,
  isPlayableRecentDuel,
} from "@/lib/arena";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anturix — Back Your Words. Bet Your SOL." },
      {
        name: "description",
        content:
          "The ultimate Private 1v1 Prediction Market on Solana. Back your words with SOL.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCoinFlipOpen, setIsCoinFlipOpen] = useState(false);
  const [recentDuel, setRecentDuel] = useState<RecentDuel | null>(null);

  useEffect(() => {
    setRecentDuel(loadRecentDuel());
  }, []);

  return (
    <MainLayout>
      <div className="hero-ambient hero-noise relative flex flex-col items-center justify-center py-10 sm:py-12 px-4 text-center max-w-5xl mx-auto space-y-10 sm:space-y-12 overflow-x-hidden">
        <div className="hero-starfield" />
        {/* Hero Section */}
        <div className="space-y-6 relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase hero-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            <Zap className="w-3 h-3 fill-primary" /> Solana Arena Live
          </div>

          <h1
            className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading tracking-tighter italic leading-[1.1] hero-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            BACK YOUR WORDS.
            <br />
            <span className="bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent">
              BET YOUR SOL.
            </span>
          </h1>

          <p
            className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed hero-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            The permissionless prediction market protocol on Solana. Create any
            market, back your prediction with SOL, and let the oracle decide.
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className="hero-fade-up relative z-10 flex flex-col sm:flex-row flex-wrap justify-center items-stretch sm:items-center gap-3 w-full max-w-3xl mx-auto px-4"
          style={{ animationDelay: "320ms" }}
        >
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="lg"
            className="h-14 sm:h-20 px-6 sm:px-8 text-sm sm:text-lg font-black tracking-[0.04em] uppercase bg-gradient-to-r from-primary to-accent text-black hover:scale-[1.02] transition-transform glow-cyan cyber-corners cta-pulse-glow w-full sm:flex-[1.35] sm:min-w-[220px] sm:max-w-none overflow-hidden justify-center"
          >
            CREATE A PRIVATE DUEL
          </Button>
          <Button
            onClick={() => setIsCoinFlipOpen(true)}
            size="lg"
            variant="outline"
            className="h-14 sm:h-20 px-6 sm:px-10 text-base sm:text-xl font-black tracking-[0.1em] uppercase bg-background/80 border-2 border-primary/60 text-primary hover:bg-primary/10 hover:border-primary hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(0,255,255,0.15)] w-full sm:flex-1 sm:max-w-[280px] sm:min-w-[160px]"
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-primary mr-2" />
            FAST COIN FLIP
          </Button>
          <Button
            onClick={() =>
              toast.info(
                "🔒 Expert Lock — Monetize your predictions. Coming in Phase 2!",
              )
            }
            size="lg"
            variant="outline"
            className="h-14 sm:h-20 px-6 sm:px-10 text-base sm:text-xl font-black tracking-[0.1em] uppercase bg-background/80 border-2 border-amber-400/80 text-amber-300 hover:bg-amber-400/10 hover:border-amber-300 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(251,191,36,0.16)] w-full sm:flex-1 sm:max-w-[280px] sm:min-w-[160px]"
          >
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 mr-2" />
            🔒 EXPERT LOCK
          </Button>
        </div>

        <div
          className="w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20 hero-fade-up relative z-10"
          style={{ animationDelay: "380ms" }}
        >
          <div className="w-full overflow-hidden">
            <div className="ticker-track py-2.5 text-xs font-heading tracking-[0.2em] uppercase text-muted-foreground whitespace-nowrap">
              ⚡ POWERED BY SOLANA · DEVNET · ZERO PLATFORM FEES · ⚡ POWERED BY
              SOLANA · DEVNET · ZERO PLATFORM FEES ·
            </div>
          </div>
        </div>

        {recentDuel && isPlayableRecentDuel(recentDuel.state) && (
          <div
            className="w-full max-w-2xl mx-auto hero-fade-up relative z-10"
            style={{ animationDelay: "420ms" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_40px_oklch(0.82_0.18_195/0.08)]">
              <div className="flex items-start gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    Resume arena
                  </p>
                  <h2 className="text-sm sm:text-base font-black text-foreground mt-1">
                    {recentDuel.title || "Your last duel"}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                    {recentDuel.url}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:self-center">
                <Button asChild variant="outline" className="gap-2">
                  <Link
                    to="/duel/$duelId"
                    params={{ duelId: recentDuel.duelId }}
                  >
                    Open arena
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Grid (Private Link focus) */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full hero-fade-up relative z-10"
          style={{ animationDelay: "460ms" }}
        >
          <div className="feature-card p-6 rounded-2xl bg-muted/20 border border-border/50 text-left space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-black text-sm uppercase tracking-widest text-foreground">
              Private Links
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Duels are hidden from the public. Only people with your unique
              invite link can join the arena.
            </p>
          </div>

          <div className="feature-card p-6 rounded-2xl bg-muted/20 border border-border/50 text-left space-y-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-heading font-black text-sm uppercase tracking-widest text-foreground">
              On-Chain Escrow
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SOL is safely locked in the Anturix smart contract. Winners are
              resolved via decentralized oracles.
            </p>
          </div>

          <div className="feature-card p-6 rounded-2xl bg-muted/20 border border-border/50 text-left space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-black text-sm uppercase tracking-widest text-foreground">
              SocialFi Native
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Built for X and Discord communities. Challenge anyone, anywhere,
              with a simple shareable URL.
            </p>
          </div>
        </div>

        <CreateBetModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
        <CoinFlipModal
          open={isCoinFlipOpen}
          onClose={() => setIsCoinFlipOpen(false)}
        />
      </div>
    </MainLayout>
  );
}
