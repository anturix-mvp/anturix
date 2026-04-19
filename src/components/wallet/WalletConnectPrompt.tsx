import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletContext } from '@/contexts/WalletContext';

export function WalletConnectPrompt() {
  const { showConnectPrompt, setShowConnectPrompt, setShowConnectModal } = useWalletContext();

  if (!showConnectPrompt) return null;

  return (
    <AnimatePresence>
      {showConnectPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowConnectPrompt(false)}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative glass-card border-gradient-cyan-magenta cyber-corners w-full max-w-xs overflow-hidden"
          >
            <div className="cyber-corners-bottom p-6 text-center">
              <button
                onClick={() => setShowConnectPrompt(false)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-7 h-7 text-primary" />
              </div>

              <h3 className="font-heading text-sm font-bold text-foreground tracking-wider mb-1">
                WALLET REQUIRED
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                Connect your wallet to continue
              </p>

              <Button
                variant="cyan"
                className="w-full gap-2"
                onClick={() => {
                  setShowConnectPrompt(false);
                  setShowConnectModal(true);
                }}
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
