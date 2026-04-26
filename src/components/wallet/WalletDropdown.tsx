import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  ExternalLink,
  LogOut,
  ChevronDown,
  Wallet,
  Check,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Connection, PublicKey } from "@solana/web3.js";
import { toast } from "sonner";

export function WalletDropdown() {
  const { authenticated, login, solanaWallet, logout } = useAuth();
  const publicKey = solanaWallet?.address || null;
  const walletName = "Privy Wallet";
  const [balance, setBalance] = useState(0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (publicKey) {
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed",
      );
      const pubKey = new PublicKey(publicKey);
      connection
        .getBalance(pubKey)
        .then((b) => setBalance(b / 1e9))
        .catch(console.error);
    }
  }, [publicKey]);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!authenticated) {
    return (
      <button
        onClick={() => login()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:border-primary/60 hover:bg-primary/20 transition-all duration-200"
      >
        <Wallet className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary hidden sm:inline">
          Login
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border hover:border-primary/40 transition-all duration-200"
      >
        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] animate-slow-spin" />
        <span className="text-sm font-heading font-semibold text-foreground">
          {balance.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">SOL</span>
        <RefreshCw className="w-3 h-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 group-hover:animate-spin transition-opacity" />
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ 
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              zIndex: 9999
            }}
            className="w-64 glass-card cyber-corners border border-border overflow-hidden"
          >
            <div className="cyber-corners-bottom p-3 space-y-1">
              {/* Wallet info */}
              <div className="p-2 rounded-lg bg-muted/50 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[10px] text-success font-medium">
                    Connected · {walletName}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-foreground break-all opacity-70 mb-1">{publicKey}</p>
                <p className="font-heading text-lg font-bold text-foreground mt-1">
                  {balance.toFixed(2)}{" "}
                  <span className="text-xs text-muted-foreground">SOL</span>
                </p>
              </div>

              {/* Actions */}
              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs text-foreground">
                  {copied ? "Copied!" : "Copy Address"}
                </span>
              </button>

              <a
                href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-foreground">
                  View on Explorer
                </span>
              </a>

              <div className="border-t border-border my-1" />

              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                  toast("Logged out successfully");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-destructive" />
                <span className="text-xs text-destructive">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
