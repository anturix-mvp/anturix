import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Clock, Coins } from "lucide-react";
import { toast } from "sonner";

const presetAmounts = [0.1, 0.5, 1, 5];

const durations = [
  { value: "1h", label: "1 Hour", short: "1H" },
  { value: "6h", label: "6 Hours", short: "6H" },
  { value: "24h", label: "24 Hours", short: "24H" },
];

interface CoinFlipModalProps {
  open: boolean;
  onClose: () => void;
}

export function CoinFlipModal({ open, onClose }: CoinFlipModalProps) {
  const [step, setStep] = useState(1);
  const [coinSide, setCoinSide] = useState<"heads" | "tails">("heads");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("24h");

  const resetForm = () => {
    setStep(1);
    setCoinSide("heads");
    setAmount("");
    setDuration("24h");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    toast("⚡ Coin Flip coming very soon — powered by VRF oracle!");
    handleClose();
  };

  const parsedAmount = parseFloat(amount);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

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
                <Zap className="w-5 h-5 text-primary fill-primary" />
                <div>
                  <h2 className="font-heading text-lg font-black tracking-widest text-foreground uppercase">
                    ⚡ CYBERPUNK COIN FLIP
                  </h2>
                  <p className="text-[9px] text-muted-foreground font-bold tracking-[0.15em] uppercase mt-0.5">
                    Private 1v1 · VRF Oracle · Fixed 2x Payout
                  </p>
                </div>
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
              {[1, 2].map((s) => (
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

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="coinflip-step1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 space-y-6"
                >
                  <div className="text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
                      Pick Your Side
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setCoinSide("heads")}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition-all relative overflow-hidden ${
                        coinSide === "heads"
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50"
                          : "bg-muted/10 border-border/50 text-muted-foreground grayscale"
                      }`}
                    >
                      {coinSide === "heads" && (
                        <motion.div
                          layoutId="coinflip-glow"
                          className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"
                        />
                      )}
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                          coinSide === "heads"
                            ? "border-cyan-500 bg-cyan-500/20"
                            : "border-muted-foreground/30 bg-muted/20"
                        }`}
                      >
                        <span className="text-2xl font-black">H</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">
                        Heads
                      </span>
                    </button>

                    <button
                      onClick={() => setCoinSide("tails")}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition-all relative overflow-hidden ${
                        coinSide === "tails"
                          ? "bg-fuchsia-500/10 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_30px_rgba(255,0,255,0.3)] ring-1 ring-fuchsia-500/50"
                          : "bg-muted/10 border-border/50 text-muted-foreground grayscale"
                      }`}
                    >
                      {coinSide === "tails" && (
                        <motion.div
                          layoutId="coinflip-glow"
                          className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent"
                        />
                      )}
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                          coinSide === "tails"
                            ? "border-fuchsia-500 bg-fuchsia-500/20"
                            : "border-muted-foreground/30 bg-muted/20"
                        }`}
                      >
                        <span className="text-2xl font-black">T</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">
                        Tails
                      </span>
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleClose}
                      className="flex-1 py-5 rounded-2xl bg-muted/20 text-muted-foreground font-black tracking-[0.2em] uppercase hover:bg-muted/30 transition-all text-[10px]"
                    >
                      [ CANCEL ]
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex-[2] py-5 rounded-2xl bg-gradient-to-r from-primary/80 to-accent/80 text-black font-black tracking-[0.2em] uppercase transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/10 text-[10px]"
                    >
                      NEXT STEP →
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="coinflip-step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  {/* Stake Amount */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-3 h-3 text-primary" />
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        Stake Amount (SOL)
                      </label>
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-6 py-6 rounded-2xl bg-muted/20 border border-border/50 text-3xl font-black text-foreground focus:outline-none focus:border-primary/50 transition-all"
                    />
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
                    <div className="grid grid-cols-3 gap-2">
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
                          {d.short}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="relative p-6 rounded-2xl bg-muted/10 border border-border/40 overflow-hidden">
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
                          Coin Flip (Private)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Your Side
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest ${
                            coinSide === "heads"
                              ? "text-cyan-400"
                              : "text-fuchsia-400"
                          }`}
                        >
                          {coinSide.toUpperCase()}
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
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Protocol Fee
                        </span>
                        <span className="text-[9px] font-black text-success uppercase tracking-widest">
                          0.00% (Hackathon Promo)
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

                  {/* Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 rounded-2xl border border-border/50 text-muted-foreground font-black tracking-widest uppercase hover:bg-muted/30 transition-all text-[10px]"
                    >
                      ← BACK
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!isValid}
                      className="flex-[2] py-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-black font-black tracking-[0.2em] uppercase disabled:opacity-20 transition-all flex items-center justify-center gap-2 text-[10px] shadow-lg shadow-primary/10"
                    >
                      FLIP & LOCK SOL ⚡
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
