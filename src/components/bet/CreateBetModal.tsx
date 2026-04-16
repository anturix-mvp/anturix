import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, Clock, Coins, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createDuel } from "@/services/duelContract";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Connection, PublicKey } from "@solana/web3.js";
import { storeRecentDuel } from "@/lib/arena";

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
  onClose: () => void;
}

export function CreateBetModal({ open, onClose }: CreateBetModalProps) {
  const { authenticated, ready, solanaWallet, login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("24h");
  const [step, setStep] = useState(1);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAmount("");
    setDuration("24h");
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

    setSubmitting(true);
    try {
      const duelId = await createDuel(activeWallet, parsedAmount);
      storeRecentDuel(duelId, title.trim() || "Untitled duel", "pending");
      toast.success("ARENA DUEL CREATED! 🔥");
      handleClose();
      navigate({ to: "/duel/$duelId", params: { duelId } });
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

  const isStep1Valid = title.trim().length > 0 && description.trim().length > 0;
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
            <div className="flex items-center gap-2 px-6 pt-6">
              {[1, 2].map((s) => (
                <div key={s} className="flex-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={false}
                      animate={{ width: step >= s ? "100%" : "0%" }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 space-y-6"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-muted-foreground mb-2 block uppercase tracking-widest">
                        Duel Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        placeholder="e.g. BTC will hit $100k by tomorrow"
                        className="w-full px-4 py-4 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-muted-foreground mb-2 block uppercase tracking-widest">
                        Description & Rules
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={4}
                        placeholder="Describe the terms of your duel..."
                        className="w-full px-4 py-4 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-primary transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-black tracking-widest uppercase disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    NEXT STEP →
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-black text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <Coins className="w-4 h-4 text-primary" /> STAKE AMOUNT
                        (SOL)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-4 py-4 rounded-xl bg-muted/30 border text-2xl font-black text-foreground focus:outline-none transition-all ${hasInsufficientBalance ? "border-destructive ring-1 ring-destructive/30" : "border-border focus:border-primary"}`}
                      />
                      <p
                        className={`mt-2 text-xs ${hasInsufficientBalance ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {walletBalance !== null
                          ? `Available: ${walletBalance.toFixed(2)} SOL`
                          : "Available: -- SOL"}
                        {hasInsufficientBalance
                          ? " · Insufficient balance"
                          : ""}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {presetAmounts.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setAmount(preset.toString())}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                              amount === preset.toString()
                                ? "bg-primary/20 text-primary border border-primary/50"
                                : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                            }`}
                          >
                            {preset} SOL
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <Clock className="w-4 h-4 text-primary" /> DUEL DURATION
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {durations.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => setDuration(d.value)}
                            className={`py-2.5 rounded-xl text-xs font-black tracking-tighter transition-all ${
                              duration === d.value
                                ? "bg-primary/20 text-primary border border-primary/50"
                                : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 rounded-xl border border-border text-foreground font-black tracking-widest uppercase hover:bg-muted/50"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={
                        !isValid || submitting || hasInsufficientBalance
                      }
                      className="flex-3 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-black tracking-widest uppercase disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />{" "}
                          CREATING...
                        </>
                      ) : (
                        <>START DUEL 🔥</>
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
