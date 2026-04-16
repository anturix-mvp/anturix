import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getDuelAccount, joinDuel } from "@/services/duelContract";
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDuelUrl, storeRecentDuel, isPlayableRecentDuel } from "@/lib/arena";
import {
  Swords,
  Share2,
  Trophy,
  Loader2,
  Check,
  Crown,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/duel/$duelId")({
  component: DuelPage,
});

function DuelPage() {
  const { duelId } = Route.useParams();
  const { solanaWallet, authenticated, login } = useAuth();
  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const fetchDuel = async () => {
    if (!solanaWallet) {
      setLoading(false);
      return;
    }
    const account = await getDuelAccount(solanaWallet, duelId);
    setDuel(account);
    setLoading(false);
  };

  useEffect(() => {
    fetchDuel();
    const interval = setInterval(fetchDuel, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [duelId, solanaWallet]);

  useEffect(() => {
    if (!duel) return;

    const state = duel.status?.active
      ? "active"
      : duel.status?.pending
        ? "pending"
        : duel.status?.resolved
          ? "resolved"
          : duel.status?.claimed
            ? "claimed"
            : undefined;

    storeRecentDuel(duelId, duel.title, state);
  }, [duelId, duel]);

  const handleJoin = async () => {
    if (!authenticated) {
      login();
      return;
    }
    if (!solanaWallet) return;

    if (duel && duel.creator.toString() === solanaWallet.address) {
      toast.error("You can't join your own duel");
      return;
    }

    setJoining(true);
    try {
      await joinDuel(solanaWallet, duelId);
      toast.success("Joined duel successfully!");
      fetchDuel();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to join duel: " + e.message);
    } finally {
      setJoining(false);
    }
  };

  const shareUrl = getDuelUrl(duelId);

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 1200);
  };

  useEffect(() => {
    if (!duel?.expiresAt) {
      setTimeLeft("");
      return;
    }

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt =
        typeof duel.expiresAt?.toNumber === "function"
          ? duel.expiresAt.toNumber()
          : Number(duel.expiresAt);
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      setTimeLeft(`${days}d ${hours}h ${minutes}m left`);
    }, 1000);

    return () => clearInterval(timer);
  }, [duel?.expiresAt]);

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-5">
          <div className="h-10 w-56 skeleton-shimmer rounded-xl" />
          <div className="h-64 w-full skeleton-shimmer rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 skeleton-shimmer rounded-xl" />
            <div className="h-20 skeleton-shimmer rounded-xl" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Syncing arena from Solana...
          </p>
        </div>
      </MainLayout>
    );
  }

  // If not authenticated or no wallet, show a prompt
  if (!authenticated) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
            <Swords className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black font-heading mb-4 uppercase tracking-tighter">
            Authentication Required
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md text-sm">
            Please log in with Privy to view and participate in this duel.
          </p>
          <Button
            onClick={() => login()}
            className="bg-primary text-primary-foreground px-8 h-12 font-bold tracking-wider"
          >
            LOGIN TO VIEW DUEL
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!duel && !loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 rounded-full bg-muted/10 flex items-center justify-center mb-6 border border-border">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-black font-heading mb-2 uppercase tracking-tighter">
            This arena doesn't exist or has ended
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md text-sm">
            The duel may have settled already, or the link is invalid.
          </p>
          <Button
            onClick={() => (window.location.href = "/")}
            className="h-12 px-8 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold tracking-wider"
          >
            Create Your Own Duel
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isCreator =
    solanaWallet && duel.creator.toString() === solanaWallet.address;
  const isOpponent =
    solanaWallet && duel.opponent.toString() === solanaWallet.address;
  const isLive = !!duel.status.active;
  const isPending = !!duel.status.pending;
  const isResolved = !!duel.status.resolved || !!duel.status.claimed;
  const winner = duel.winner ? duel.winner.toString() : null;
  const creator = duel.creator.toString();
  const opponent = duel.opponent.toString();
  const hasOpponent = opponent !== "11111111111111111111111111111111";
  const stakeLamports =
    typeof duel.stakeAmount?.toString === "function"
      ? Number(duel.stakeAmount.toString())
      : Number(duel.stakeAmount);
  const prizePoolSol = (stakeLamports / 1e9) * 2;
  const shortAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
        <Card className="glass-card p-6 sm:p-8 border-gradient-cyan-magenta cyber-corners relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Swords className="w-32 h-32" />
          </div>

          <div className="text-center space-y-4 relative z-10">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase mb-4 ${
                isLive
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : isPending
                    ? "bg-success/10 border-success/20 text-success"
                    : "bg-success/10 border-success/20 text-success"
              }`}
            >
              {isLive ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />{" "}
                  DUEL IS LIVE
                </>
              ) : isPending ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-success arena-open-dot" />{" "}
                  ARENA OPEN
                </>
              ) : (
                <>
                  <Trophy className="w-3 h-3" /> Duel Concluded
                </>
              )}
            </div>

            <h1 className="text-4xl font-black font-heading tracking-tighter text-foreground mb-2 italic">
              ARENA <span className="text-primary">DUEL</span>
            </h1>

            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-xs mx-auto opacity-50 mb-6">
              ID: {duelId}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 px-4 sm:px-12 bg-muted/20 rounded-3xl border border-border/50">
              {/* Creator Side */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                    <span className="text-3xl font-black text-primary">C</span>
                  </div>
                  {winner === duel.creator.toString() && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 p-1.5 rounded-full shadow-lg">
                      <Trophy className="w-4 h-4 text-black" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Creator
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {shortAddress(creator)}
                  </p>
                </div>
              </div>

              <div className="text-4xl sm:text-5xl font-black italic bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent vs-pulse-glow">
                ⚔️ VS ⚔️
              </div>

              {/* Opponent Side */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="relative">
                  {hasOpponent ? (
                    <div
                      className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden ${
                        winner === opponent
                          ? "bg-success/20 border-success/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                          : "bg-accent/20 border-accent/40 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                      }`}
                    >
                      <span
                        className={`text-3xl font-black ${winner === opponent ? "text-success" : "text-accent"}`}
                      >
                        O
                      </span>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-muted/20 border-2 border-dashed border-muted-foreground/40 flex items-center justify-center group">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
                    </div>
                  )}
                  {winner === opponent && (
                    <div className="absolute -top-3 -left-3 bg-yellow-400 p-1.5 rounded-full shadow-lg">
                      <Trophy className="w-4 h-4 text-black" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {hasOpponent ? "Opponent" : "Open Slot"}
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {hasOpponent ? shortAddress(opponent) : "Waiting..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                  Stakes
                </p>
                <p className="text-2xl font-black text-success">
                  {(stakeLamports / 1e9).toFixed(2)} SOL
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                  Total Prize
                </p>
                <p className="text-2xl font-black text-primary">
                  {prizePoolSol.toFixed(2)} SOL
                </p>
              </div>
            </div>

            {isPending && !isCreator && !isOpponent && (
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="w-full h-16 text-xl font-black tracking-[0.2em] uppercase bg-gradient-to-r from-primary to-accent hover:scale-[1.02] transition-transform glow-cyan cyber-corners"
              >
                {joining ? (
                  <>
                    <Loader2 className="animate-spin mr-2" /> PROCESSING
                  </>
                ) : (
                  "JOIN ARENA 🔥"
                )}
              </Button>
            )}

            {isPending && isCreator && (
              <div className="space-y-4 pt-4 border-t border-border mt-8">
                <div className="flex items-center gap-2 justify-center text-muted-foreground">
                  <Share2 className="w-3 h-3" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    Share Invite Link With Your Opponent
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-[10px] font-mono text-foreground truncate flex items-center">
                    {shareUrl}
                  </div>
                  <Button
                    onClick={copyShareLink}
                    variant="outline"
                    className="h-10 px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      "COPY"
                    )}
                  </Button>
                </div>
                {timeLeft && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> {timeLeft}
                  </div>
                )}
              </div>
            )}

            {isLive && (
              <div className="mt-8 p-6 rounded-2xl bg-destructive/10 border border-destructive/20 animate-pulse">
                <p className="text-xs font-black text-destructive uppercase tracking-widest">
                  Duel is currently in progress
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 underline">
                  Awaiting oracle resolution...
                </p>
              </div>
            )}

            {isResolved && (
              <div className="mt-8 p-8 rounded-2xl bg-success/5 border-2 border-success/20 relative overflow-hidden winner-celebration">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-success text-success-foreground text-[10px] font-black rounded-full uppercase tracking-widest">
                  Result
                </div>
                <div className="confetti-burst" />
                <Crown className="w-12 h-12 text-gold mx-auto mb-4 trophy-float" />
                <h3 className="text-4xl font-black font-heading uppercase italic tracking-tighter winner-gradient">
                  🏆 WINNER
                </h3>
                <p className="font-mono text-xs text-success bg-success/10 py-2 px-4 rounded-lg inline-block mt-4 border border-success/30">
                  {winner ? shortAddress(winner) : "Unknown"}
                </p>
                <p className="text-lg font-black text-success mt-4">
                  Prize Pool: {prizePoolSol.toFixed(2)} SOL
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
