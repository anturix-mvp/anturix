import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, Clock, Coins, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createDuel } from "@/services/duelContract";
import { toast } from "sonner";
import { Connection, PublicKey } from "@solana/web3.js";
import { storeRecentDuel } from "@/lib/arena";
import {
  Dices,
  Info,
  Eye,
  Users as UsersIcon,
  Bitcoin,
  Trophy as TrophyIcon,
  TrendingUp,
  TrendingDown,
  Lock,
} from "lucide-react";

const durations = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "7 Days" },
];

const presetAmounts = [0.1, 0.5, 1, 5, 10];

interface CreateBetModalProps {
  open: boolean;
  preset?: "standard" | "coinflip";
  onClose: () => void;
}

export function CreateBetModal({
  open,
  preset = "standard",
  onClose,
}: CreateBetModalProps) {
  const { authenticated, ready, solanaWallet, login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("24h");
  const [useCoinToss, setUseCoinToss] = useState(true);
  const [activeCategory, setActiveCategory] = useState<
    "general" | "crypto" | "sports"
  >("general");
  const [activeType, setActiveType] = useState<"1v1" | "expert" | "pool">(
    "1v1",
  );
  const [mode, setMode] = useState<"private" | "public">("private");
  const [position, setPosition] = useState<"up" | "down">("up");
  const [coinSide, setCoinSide] = useState<"heads" | "tails">("heads");
  const [isFastCoinFlip, setIsFastCoinFlip] = useState(false);
  const [step, setStep] = useState(1);

  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAmount("");
    setDuration("24h");
    setUseCoinToss(true);
    setMode("private");
    setPosition("up");
    setCoinSide("heads");
    setIsFastCoinFlip(false);
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const refreshBalance = async (address: string) => {
    try {
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed",
      );
      const lamports = await connection.getBalance(
        new PublicKey(address),
        "confirmed",
      );
      setWalletBalance(lamports / 1_000_000_000);
    } catch {
      setWalletBalance(null);
    }
  };

  useEffect(() => {
    if (!open || step !== 2) return;

    const address = solanaWallet?.address;
    if (address) {
      void refreshBalance(address);
      return;
    }

    if (typeof window !== "undefined") {
      const phantomProvider =
        (window as any)?.phantom?.solana ?? (window as any)?.solana;
      if (phantomProvider?.isPhantom && phantomProvider?.publicKey) {
        void refreshBalance(phantomProvider.publicKey.toString());
      }
    }
  }, [open, step, solanaWallet?.address]);

  useEffect(() => {
    if (!open) return;

    if (preset === "coinflip") {
      setMode("private");
      setActiveCategory("general");
      setActiveType("1v1");
      setIsFastCoinFlip(true);
      setUseCoinToss(false);
      setTitle("Cyberpunk Coin Flip (VRF)");
      setDescription(
        "Instant private Heads/Tails duel settled by VRF oracle. Winner takes payout automatically.",
      );
      setStep(3);
    }
  }, [open, preset]);

  useEffect(() => {
    if (isFastCoinFlip) {
      setPosition(coinSide === "heads" ? "up" : "down");
    }
  }, [coinSide, isFastCoinFlip]);

  const handleSubmit = async () => {
    if (!ready) {
      toast.error("Auth is still loading. Please wait a moment.");
      return;
    }

    if (!authenticated) {
      toast.error("Please log in first to create a duel.");
      login();
      return;
    }

    let activeWallet: any = solanaWallet;

    if (!activeWallet && typeof window !== "undefined") {
      const phantomProvider =
        (window as any)?.phantom?.solana ?? (window as any)?.solana;

      if (phantomProvider?.isPhantom) {
        try {
          await phantomProvider.connect();
          activeWallet = {
            address: phantomProvider.publicKey?.toString(),
            publicKey: phantomProvider.publicKey,
            signTransaction:
              phantomProvider.signTransaction?.bind(phantomProvider),
            signAllTransactions:
              phantomProvider.signAllTransactions?.bind(phantomProvider),
          };
        } catch {
          toast.error("Phantom connection was rejected or unavailable.");
          return;
        }
      }
    }

    if (!activeWallet?.address) {
      toast.error("No Solana wallet detected. Unlock Phantom and try again.");
      return;
    }

    void refreshBalance(activeWallet.address);

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid duel amount.");
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      const resolvedTitle = isFastCoinFlip
        ? `Cyberpunk Coin Flip: ${coinSide.toUpperCase()} (VRF)`
        : title;
      const baseDescription = isFastCoinFlip
        ? `Fast private coin flip ticket. Picked side: ${coinSide.toUpperCase()}.\n[VRF_COIN_FLIP] Resolve using VRF oracle with provable randomness.`
        : description;

      const finalDescription =
        !isFastCoinFlip && useCoinToss
          ? `${baseDescription}\n\n[COIN_TOSS_RESOLVE] RESOLUTION: Mutual agreement required. If neither party agrees, an automated coin toss will decide the winner.`
          : baseDescription;

      const duelId = await createDuel(
        activeWallet,
        parsedAmount,
        mode,
        position,
      );

      storeRecentDuel(
        duelId,
        resolvedTitle.trim() || "Untitled duel",
        "pending",
        finalDescription,
      );

      toast.success("ARENA DUEL CREATED! 🔥");
      handleClose();
      window.location.assign(`/duel/${duelId}`);
    } catch (e: any) {
      console.error(e);
      const message = String(e?.message || "Failed to create duel");
      if (
        message.includes("Insufficient Devnet SOL") ||
        message.includes("no spendable Devnet SOL") ||
        message.includes(
          "Attempt to debit an account but found no record of a prior credit",
        )
      ) {
        toast.error(
          "Not enough Devnet SOL. Switch Phantom to Devnet and fund your wallet at faucet.solana.com.",
        );
      } else {
        toast.error("Failed to create duel: " + message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid =
    isFastCoinFlip ||
    (title.trim().length > 0 && description.trim().length > 0);
  const isValid = isStep1Valid && parseFloat(amount) > 0;
  const parsedStakeAmount = parseFloat(amount);
  const hasInsufficientBalance =
    Number.isFinite(parsedStakeAmount) &&
    walletBalance !== null &&
    parsedStakeAmount > walletBalance;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-lg h-[100vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl bg-card border-0 sm:border border-border shadow-2xl z-10"
          >
            {/* Handle bar (mobile) */}
            <div className="sm:hidden flex justify-center pt-3">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-lg font-black tracking-widest text-foreground uppercase">
                  CREATE 1V1 DUEL
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 px-6 pt-6 mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1">
                  <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      initial={false}
                      animate={{ width: step >= s ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Steps */}

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setMode("public");
                        setStep(2);
                      }}
                      className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-300"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
                        <div className="relative">
                          <UsersIcon className="w-10 h-10 text-cyan-400" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h4 className="font-heading text-lg font-black tracking-widest text-cyan-400 uppercase">
                          PUBLIC ARENA
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-2 leading-relaxed max-w-[140px] mx-auto">
                          Open challenge. Appears in the global feed for all
                          users.
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setMode("private");
                        setStep(2);
                      }}
                      className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all duration-300"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform">
                        <Lock className="w-10 h-10 text-orange-400" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-heading text-lg font-black tracking-widest text-orange-400 uppercase">
                          PRIVATE DUEL
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-2 leading-relaxed max-w-[140px] mx-auto">
                          Invite-only. Generate a unique duel link for your
                          opponent.
                        </p>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full py-4 text-[10px] font-black tracking-[0.3em] text-muted-foreground hover:text-foreground uppercase transition-colors"
                  >
                    [ CANCEL ]
                  </button>
                </motion.div>
              ) : step === 2 ? (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-8"
                >
                  {/* Category Tabs */}
                  <div className="flex p-1 bg-muted/30 rounded-2xl border border-border/50">
                    {[
                      {
                        id: "general",
                        label: "GENERAL",
                        icon: Zap,
                        soon: false,
                      },
                      {
                        id: "crypto",
                        label: "CRYPTO",
                        icon: Bitcoin,
                        soon: true,
                      },
                      {
                        id: "sports",
                        label: "SPORTS",
                        icon: TrophyIcon,
                        soon: true,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() =>
                          !tab.soon && setActiveCategory(tab.id as any)
                        }
                        className={`flex-1 relative flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                          activeCategory === tab.id
                            ? "bg-card text-primary shadow-lg border border-primary/20"
                            : "text-muted-foreground hover:text-foreground grayscale-[0.8]"
                        } ${tab.soon ? "cursor-not-allowed" : ""}`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black tracking-widest">
                          {tab.label}
                        </span>
                        {tab.soon && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[6px] font-black border border-primary/30">
                            SOON
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Bet Type Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      Bet Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          id: "1v1",
                          label: "1V1 DUEL",
                          sub: "Challenge someone directly",
                          icon: Swords,
                          soon: false,
                        },
                        {
                          id: "expert",
                          label: "EXPERT LOCK",
                          sub: "Monetize your prediction",
                          icon: Eye,
                          soon: true,
                        },
                        {
                          id: "pool",
                          label: "POKER POOL",
                          sub: "Group stakes pool",
                          icon: UsersIcon,
                          soon: true,
                        },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => !t.soon && setActiveType(t.id as any)}
                          className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center aspect-square gap-3 ${
                            activeType === t.id
                              ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,255,0.15)] ring-1 ring-primary/20"
                              : "bg-muted/10 border-border/50 hover:bg-muted/30"
                          } ${t.soon ? "cursor-not-allowed grayscale opacity-50" : ""}`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeType === t.id ? "bg-primary text-black" : "bg-muted text-muted-foreground"}`}
                          >
                            <t.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p
                              className={`text-[10px] font-black tracking-tight leading-none ${activeType === t.id ? "text-primary" : "text-foreground"}`}
                            >
                              {t.label}
                            </p>
                            <p className="text-[7px] text-muted-foreground mt-1 leading-tight px-1">
                              {t.sub}
                            </p>
                          </div>
                          {t.soon && (
                            <span className="absolute top-2 right-2 px-1 py-0.5 rounded bg-muted text-muted-foreground text-[5px] font-black border border-border uppercase">
                              SOON
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Event Title
                        </label>
                        <span className="text-[8px] font-mono text-muted-foreground">
                          {title.length}/100
                        </span>
                      </div>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        placeholder="e.g. Will ETH break $4000 today?"
                        className="w-full px-5 py-5 rounded-2xl bg-muted/20 border border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all font-medium italic"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Rules / Description
                        </label>
                        <span className="text-[8px] font-mono text-muted-foreground">
                          {description.length}/500
                        </span>
                      </div>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Explain how this duel is settled..."
                        className="w-full px-5 py-5 rounded-2xl bg-muted/20 border border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all resize-none font-medium italic"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 rounded-2xl bg-muted/20 text-muted-foreground font-black tracking-[0.2em] uppercase hover:bg-muted/30 transition-all text-[10px]"
                    >
                      ← BACK
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!isStep1Valid}
                      className="flex-[2] py-5 rounded-2xl bg-gradient-to-r from-primary/80 to-accent/80 text-black font-black tracking-[0.2em] uppercase disabled:opacity-20 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/10 text-[10px]"
                    >
                      NEXT STEP →
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  <div className="space-y-6">
                    {/* Visibility Mode */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        Visibility / Mode
                      </label>
                      <div className="flex gap-4 p-1 bg-muted/20 rounded-2xl border border-border/50">
                        <button
                          onClick={() => setMode("private")}
                          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                            mode === "private"
                              ? "bg-primary text-black shadow-lg"
                              : "text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Lock className="w-3 h-3" />
                            <span className="text-[10px] font-black tracking-widest uppercase">
                              Private Duel
                            </span>
                          </div>
                          <span className="text-[8px] font-bold opacity-70">
                            Invite-only · Fixed 2x payout
                          </span>
                        </button>
                        <button
                          onClick={() => setMode("public")}
                          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                            mode === "public"
                              ? "bg-primary text-black shadow-lg"
                              : "text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <UsersIcon className="w-3 h-3" />
                            <span className="text-[10px] font-black tracking-widest uppercase">
                              Public Arena
                            </span>
                          </div>
                          <span className="text-[8px] font-bold opacity-70">
                            Global feed · Dynamic odds
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Stake Amount */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Coins className="w-3 h-3 text-primary" />
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Stake Amount (SOL)
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className={`w-full px-6 py-6 rounded-2xl bg-muted/20 border text-3xl font-black text-foreground focus:outline-none transition-all ${hasInsufficientBalance ? "border-destructive/50 ring-1 ring-destructive/20" : "border-border/50 focus:border-primary/50"}`}
                        />
                        {hasInsufficientBalance && (
                          <p className="mt-2 text-[10px] font-bold text-destructive flex items-center gap-1">
                            <Info className="w-3 h-3" /> Insufficient Balance
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {presetAmounts.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setAmount(preset.toString())}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border ${
                              amount === preset.toString()
                                ? "bg-primary/20 text-primary border-primary/40"
                                : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40 hover:border-border/50"
                            }`}
                          >
                            {preset} SOL
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-primary" />
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Expiry Duration
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {durations.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => setDuration(d.value)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                              duration === d.value
                                ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_10px_rgba(0,255,255,0.1)]"
                                : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40"
                            }`}
                          >
                            {d.label.split(" ")[0]}{" "}
                            {d.label.split(" ")[1]?.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Public Mode & Crypto Category: Position Selection */}
                    {mode === "public" && activeCategory === "crypto" && (
                      <div className="space-y-4 pt-2 border-t border-border/30">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Your Position
                        </label>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setPosition("up")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border transition-all ${
                              position === "up"
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                : "bg-muted/10 border-border/50 text-muted-foreground"
                            }`}
                          >
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-black uppercase italic tracking-widest">
                              UP
                            </span>
                          </button>
                          <button
                            onClick={() => setPosition("down")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border transition-all ${
                              position === "down"
                                ? "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                                : "bg-muted/10 border-border/50 text-muted-foreground"
                            }`}
                          >
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-xs font-black uppercase italic tracking-widest">
                              DOWN
                            </span>
                          </button>
                        </div>
                        <p className="text-[9px] text-center text-muted-foreground italic">
                          Current odds: 1.0x — Be the first to seed this pool
                        </p>
                      </div>
                    )}

                    {/* Private Mode: Fast Coin Flip */}
                    {mode === "private" && (
                      <div className="space-y-4 pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                            Cyberpunk Coin Flip
                          </label>
                          <button
                            onClick={() => setIsFastCoinFlip((prev) => !prev)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                              isFastCoinFlip
                                ? "bg-primary/20 border-primary/50 text-primary"
                                : "bg-muted/20 border-border/40 text-muted-foreground"
                            }`}
                          >
                            {isFastCoinFlip ? "Enabled" : "Enable"}
                          </button>
                        </div>

                        {isFastCoinFlip && (
                          <>
                            <div className="flex gap-4">
                              <button
                                onClick={() => setCoinSide("heads")}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border transition-all ${
                                  coinSide === "heads"
                                    ? "bg-primary/10 border-primary/50 text-primary shadow-[0_0_20px_rgba(0,255,255,0.1)]"
                                    : "bg-muted/10 border-border/50 text-muted-foreground"
                                }`}
                              >
                                <Dices className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">
                                  Heads
                                </span>
                              </button>
                              <button
                                onClick={() => setCoinSide("tails")}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border transition-all ${
                                  coinSide === "tails"
                                    ? "bg-accent/10 border-accent/50 text-accent shadow-[0_0_20px_rgba(255,0,153,0.1)]"
                                    : "bg-muted/10 border-border/50 text-muted-foreground"
                                }`}
                              >
                                <Dices className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">
                                  Tails
                                </span>
                              </button>
                            </div>
                            <p className="text-[9px] text-center text-muted-foreground italic">
                              Private 1v1 VRF flow. Side locks at creation.
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Summary Box */}
                    <div className="relative p-6 rounded-2xl bg-muted/10 border border-border/40 overflow-hidden">
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/40" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40" />

                      <div className="space-y-3">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4">
                          Summary
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Mode
                          </span>
                          <span className="text-[9px] font-black text-foreground uppercase tracking-widest">
                            {mode === "private"
                              ? "Private Duel"
                              : "Public Arena"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Heading
                          </span>
                          <span className="text-[9px] font-black text-foreground uppercase tracking-widest truncate max-w-[150px]">
                            "
                            {isFastCoinFlip
                              ? `Coin Flip ${coinSide.toUpperCase()}`
                              : title || "Untitled"}
                            "
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Expires In
                          </span>
                          <span className="text-[9px] font-black text-foreground uppercase tracking-widest">
                            {durations.find((d) => d.value === duration)?.label}
                          </span>
                        </div>
                        <div className="pt-4 mt-2 border-t border-border/30 flex justify-between items-end">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                            Total Stake
                          </span>
                          <span className="text-2xl font-black text-primary italic tracking-tighter leading-none">
                            {amount || "0"}{" "}
                            <span className="text-sm font-black">SOL</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-5 rounded-2xl border border-border/50 text-muted-foreground font-black tracking-widest uppercase hover:bg-muted/30 transition-all text-[10px]"
                    >
                      ← BACK
                    </button>

                    <button
                      onClick={handleSubmit}
                      disabled={
                        !isValid || submitting || hasInsufficientBalance
                      }
                      className="flex-[2] py-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-black font-black tracking-[0.2em] uppercase disabled:opacity-20 transition-all flex items-center justify-center gap-2 text-[10px] shadow-lg shadow-primary/10"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />{" "}
                          PROCESSING...
                        </>
                      ) : (
                        <>
                          {mode === "private"
                            ? "STAKE & CREATE ⚔️"
                            : "POST TO PUBLIC ARENA ⚔️"}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center px-6"
          >
            <div className="text-center space-y-4">
              <div className="solana-ring-loader mx-auto" />
              <p className="text-base font-heading font-bold tracking-wider text-foreground">
                Locking SOL into escrow...
              </p>
              <p className="text-sm text-muted-foreground">
                Approve the transaction in your wallet
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
