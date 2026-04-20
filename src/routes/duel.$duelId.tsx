import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  getDuelAccount,
  joinDuel,
  getEntryQuote,
  getMyPositions,
  claimTicket,
  type PositionView,
} from "@/services/duelContract";
import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getDuelUrl,
  storeRecentDuel,
  isPlayableRecentDuel,
  loadRecentDuel,
} from "@/lib/arena";
import {
  Swords,
  Share2,
  Trophy,
  Loader2,
  Check,
  Crown,
  Clock,
  AlertCircle,
  Dices,
  FileText,
  Users,
  Lock,
  Globe,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/duel/$duelId")({
  component: DuelPage,
});

function DuelPage() {
  const { duelId } = Route.useParams();
  const { solanaWallet, authenticated, login } = useAuth();
  const walletAddress = solanaWallet?.address;
  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [metadata, setMetadata] = useState<any>(null);
  const [joinAmount, setJoinAmount] = useState<string>("");
  const [joinSide, setJoinSide] = useState<"up" | "down">("down");
  const [entryQuote, setEntryQuote] = useState<{
    odds: number;
    payoutSol: number;
  }>({
    odds: 0,
    payoutSol: 0,
  });
  const [positions, setPositions] = useState<PositionView[]>([]);
  const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const fetchDuel = useCallback(async () => {
    if (!solanaWallet || !walletAddress) {
      setLoading(false);
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const account = await getDuelAccount(solanaWallet, duelId);
      setDuel(account);
      if (account?.stakeAmount) {
        const stake = Number(account.stakeAmount.toString()) / 1e9;
        setJoinAmount((prev) => (prev ? prev : stake.toString()));
      }

      if (account && walletAddress) {
        const mine = await getMyPositions(solanaWallet, duelId);
        setPositions(mine);
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [duelId, solanaWallet, walletAddress]);

  useEffect(() => {
    fetchDuel();
    setMetadata(loadRecentDuel(duelId));

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchDuel();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [duelId, fetchDuel]);

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

    const parsedJoinAmount = parseFloat(joinAmount);
    if (isNaN(parsedJoinAmount) || parsedJoinAmount <= 0) {
      toast.error("Please enter a valid stake amount");
      return;
    }

    if (
      !isPublicArena &&
      duel &&
      duel.creator.toString() === solanaWallet.address
    ) {
      toast.error("You can't join your own duel");
      return;
    }

    setJoining(true);
    try {
      await joinDuel(solanaWallet, duelId, joinSide, parsedJoinAmount);
      toast.success("Joined arena successfully! 🔥");
      fetchDuel();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to join arena: " + e.message);
    } finally {
      setJoining(false);
    }
  };

  const handleClaimTicket = async (ticket: PositionView) => {
    if (!authenticated || !solanaWallet) {
      login();
      return;
    }

    setClaimingTicketId(ticket.pubkey);
    try {
      await claimTicket(solanaWallet, duelId, ticket.pubkey);
      toast.success("Ticket claimed successfully! 🔥");
      await fetchDuel();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to claim ticket: " + e.message);
    } finally {
      setClaimingTicketId(null);
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

  useEffect(() => {
    const parsedJoinAmount = parseFloat(joinAmount);
    if (
      !solanaWallet ||
      !duel ||
      !isFinite(parsedJoinAmount) ||
      parsedJoinAmount <= 0
    ) {
      setEntryQuote({ odds: 0, payoutSol: 0 });
      return;
    }

    let cancelled = false;
    getEntryQuote(solanaWallet, duelId, joinSide, parsedJoinAmount)
      .then((quote) => {
        if (!cancelled) {
          setEntryQuote(quote);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntryQuote({ odds: 0, payoutSol: 0 });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [duel, duelId, joinAmount, joinSide, solanaWallet]);

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
  const isPublicArena = !!duel.mode?.publicArena;
  const poolUp = Number(duel.poolUpTotal?.toString() || "0") / 1e9;
  const poolDown = Number(duel.poolDownTotal?.toString() || "0") / 1e9;
  const totalPool = poolUp + poolDown;

  const creatorSide = !!duel.creatorSide?.up ? "up" : "down";
  const winner = duel.winner ? duel.winner.toString() : null;
  const creator = duel.creator.toString();
  const opponent = duel.opponent.toString();
  const hasOpponent =
    opponent !== "11111111111111111111111111111111" ||
    totalPool > Number(duel.stakeAmount?.toString() || "0") / 1e9;
  const stakeLamports =
    typeof duel.stakeAmount?.toString === "function"
      ? Number(duel.stakeAmount.toString())
      : Number(duel.stakeAmount);
  const prizePoolSol = isPublicArena ? totalPool : (stakeLamports / 1e9) * 2;
  const winningSide = duel.winningSide?.up ? "up" : "down";
  const claimableTickets = positions.filter(
    (ticket) => isResolved && !ticket.claimed && ticket.side === winningSide,
  );

  // Dynamic Multipliers
  const upMultiplier = poolUp > 0 ? (totalPool / poolUp).toFixed(2) : "1.00";
  const downMultiplier =
    poolDown > 0 ? (totalPool / poolDown).toFixed(2) : "1.00";

  const shortAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
        <Card className="glass-card p-6 sm:p-8 border-gradient-cyan-magenta cyber-corners relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            {isPublicArena ? (
              <Globe className="w-32 h-32" />
            ) : (
              <Swords className="w-32 h-32" />
            )}
          </div>

          <div className="text-center space-y-4 relative z-10">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase ${
                  isLive
                    ? "bg-primary/10 border-primary/30 text-primary"
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

              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase ${isPublicArena ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-orange-500/10 border-orange-500/30 text-orange-400"}`}
              >
                {isPublicArena ? (
                  <Users className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {isPublicArena ? "Public Arena · Pool" : "Private Duel · 1v1"}
              </div>
            </div>

            <h1 className="text-4xl font-black font-heading tracking-tighter text-foreground mb-2 italic">
              {isPublicArena ? "POOL" : "ARENA"}{" "}
              <span className="text-primary">
                {isPublicArena ? "ARENA" : "DUEL"}
              </span>
            </h1>

            {metadata?.title && (
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">
                {metadata.title}
              </h2>
            )}

            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-xs mx-auto opacity-50 mb-4">
              ID: {duelId}
            </p>

            {isPublicArena && (
              <div className="grid grid-cols-2 gap-4 py-6 bg-muted/10 rounded-3xl border border-border/30 px-6 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      Team UP
                    </span>
                    <span className="text-xs font-black text-emerald-500">
                      {upMultiplier}x
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(poolUp / (totalPool || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-foreground">
                    {poolUp.toFixed(2)} SOL
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">
                      Team DOWN
                    </span>
                    <span className="text-xs font-black text-rose-500">
                      {downMultiplier}x
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-rose-500"
                      style={{
                        width: `${(poolDown / (totalPool || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-foreground">
                    {poolDown.toFixed(2)} SOL
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 px-4 sm:px-12 bg-muted/20 rounded-3xl border border-border/50 mt-4">
              {/* Creator Side */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="relative">
                  <div
                    className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-lg ${creatorSide === "up" ? "bg-emerald-500/10 border-emerald-500/40" : "bg-rose-500/10 border-rose-500/40"}`}
                  >
                    <span
                      className={`text-3xl font-black ${creatorSide === "up" ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {creatorSide === "up" ? "▲" : "▼"}
                    </span>
                  </div>
                  {winner === duel.creator.toString() && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 p-1.5 rounded-full shadow-lg">
                      <Trophy className="w-4 h-4 text-black" />
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-left">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-black">
                    Your Potential Payout
                  </p>
                  <p className="text-lg font-black text-foreground mt-1">
                    {entryQuote.payoutSol > 0
                      ? `${entryQuote.payoutSol.toFixed(4)} SOL`
                      : "Insufficient market liquidity"}
                  </p>
                  {entryQuote.odds > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Locked Odds: {entryQuote.odds.toFixed(2)}x at entry
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Creator ({creatorSide.toUpperCase()})
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
                      className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-lg ${creatorSide === "down" ? "bg-emerald-500/10 border-emerald-500/40" : "bg-rose-500/10 border-rose-500/40"}`}
                    >
                      <span
                        className={`text-3xl font-black ${creatorSide === "down" ? "text-emerald-500" : "text-rose-500"}`}
                      >
                        {creatorSide === "down" ? "▲" : "▼"}
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
                    {isPublicArena
                      ? "OPPONENTS"
                      : hasOpponent
                        ? "Opponent"
                        : "Open Slot"}
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {isPublicArena
                      ? `${(isPublicArena ? (creatorSide === "up" ? poolDown : poolUp) : 0).toFixed(2)} SOL`
                      : hasOpponent
                        ? shortAddress(opponent)
                        : "Waiting..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                  {isPublicArena ? "Liquidity" : "Stakes"}
                </p>
                <p className="text-2xl font-black text-success">
                  {isPublicArena
                    ? totalPool.toFixed(2)
                    : (stakeLamports / 1e9).toFixed(2)}{" "}
                  SOL
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                  {isPublicArena ? "Prediction" : "Total Prize"}
                </p>
                <p className="text-2xl font-black text-primary uppercase">
                  {isPublicArena
                    ? "Pyth Oracle"
                    : `${prizePoolSol.toFixed(2)} SOL`}
                </p>
              </div>
            </div>

            {((isPublicArena && !isResolved) ||
              (!isPublicArena && isPending && !isCreator)) && (
              <div className="space-y-4 pt-6 border-t border-border/50">
                {isPublicArena && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setJoinSide("up")}
                      className={`flex-1 py-4 rounded-xl border-2 font-black transition-all ${
                        joinSide === "up"
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-xl"
                          : "bg-muted/30 border-transparent text-muted-foreground"
                      }`}
                    >
                      ▲ STAKE UP
                    </button>
                    <button
                      onClick={() => setJoinSide("down")}
                      className={`flex-1 py-4 rounded-xl border-2 font-black transition-all ${
                        joinSide === "down"
                          ? "bg-rose-500/10 border-rose-500 text-rose-500 shadow-xl"
                          : "bg-muted/30 border-transparent text-muted-foreground"
                      }`}
                    >
                      ▼ STAKE DOWN
                    </button>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="number"
                    value={joinAmount}
                    onChange={(e) => setJoinAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-6 py-5 rounded-2xl bg-muted/50 border border-border text-2xl font-black text-foreground focus:outline-none focus:border-primary/50 text-center"
                    disabled={!isPublicArena} // 1v1 enforces matching amount
                  />
                  {!isPublicArena && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-primary/20 text-primary text-[8px] font-black rounded-lg">
                      FIXED MATCH
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full h-16 text-xl font-black tracking-[0.2em] uppercase bg-gradient-to-r from-primary to-accent hover:scale-[1.02] transition-transform glow-cyan cyber-corners"
                >
                  {joining ? (
                    <>
                      <Loader2 className="animate-spin mr-2" /> PROCESSING
                    </>
                  ) : isPublicArena ? (
                    "PLACE STAKE 🔥"
                  ) : (
                    "JOIN ARENA 🔥"
                  )}
                </Button>
              </div>
            )}

            {metadata?.description && (
              <div className="py-6 border-t border-border mt-2 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Terms & Conditions
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-border text-left">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {metadata.description.replace("[COIN_TOSS_RESOLVE] ", "")}
                  </p>
                </div>
              </div>
            )}

            {positions.length > 0 && (
              <div className="py-6 border-t border-border mt-2 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  My Positions
                </p>
                <div className="space-y-2">
                  {positions.map((p) => (
                    <div
                      key={p.pubkey}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">
                          {p.side === "up" ? "UP" : "DOWN"} ·{" "}
                          {p.lockedOdds.toFixed(2)}x
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Stake {p.amountSol.toFixed(4)} SOL · Payout{" "}
                          {p.potentialPayoutSol.toFixed(4)} SOL
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${p.claimed ? "text-success" : "text-primary"}`}
                      >
                        {p.claimed ? "Claimed" : "Open"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isPublicArena && isPending && isCreator && (
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

            {isResolved && positions.length > 0 && (
              <div className="mt-6 p-6 rounded-2xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      Claim My Tickets
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Winning tickets are claimable one by one.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {claimableTickets.length} Claimable
                  </span>
                </div>

                {claimableTickets.length > 0 ? (
                  <div className="space-y-3">
                    {claimableTickets.map((ticket) => (
                      <div
                        key={ticket.pubkey}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-muted/20 border border-border"
                      >
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-foreground">
                            {ticket.side === "up" ? "UP" : "DOWN"} ·{" "}
                            {ticket.lockedOdds.toFixed(2)}x
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Stake {ticket.amountSol.toFixed(4)} SOL · Payout{" "}
                            {ticket.potentialPayoutSol.toFixed(4)} SOL
                          </p>
                        </div>
                        <Button
                          onClick={() => handleClaimTicket(ticket)}
                          disabled={claimingTicketId === ticket.pubkey}
                          className="sm:w-auto w-full h-11 px-5 bg-primary text-black font-black uppercase tracking-widest"
                        >
                          {claimingTicketId === ticket.pubkey
                            ? "Claiming..."
                            : "Claim"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No winning tickets are pending claim.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
