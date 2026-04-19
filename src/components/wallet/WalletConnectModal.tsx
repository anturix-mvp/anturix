import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet } from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';

const wallets = [
  {
    name: 'Phantom',
    icon: 'https://raw.githubusercontent.com/nicnocquee/cryptocurrency-icons/master/128/color/phantom.png',
    description: 'The most popular Solana wallet',
    color: 'from-[#AB9FF2] to-[#534BB1]',
  },
  {
    name: 'Solflare',
    icon: 'https://raw.githubusercontent.com/nicnocquee/cryptocurrency-icons/master/128/color/sol.png',
    description: 'Non-custodial Solana wallet',
    color: 'from-[#FE8C00] to-[#F83600]',
  },
];

export function WalletConnectModal() {
  const { showConnectModal, setShowConnectModal, connect, connecting } = useWalletContext();

  if (!showConnectModal) return null;

  return (
    <AnimatePresence>
      {showConnectModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowConnectModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative glass-card cyber-corners border-gradient-cyan-magenta w-full max-w-sm overflow-hidden"
          >
            <div className="cyber-corners-bottom p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-bold text-foreground tracking-wider">CONNECT WALLET</h2>
                    <p className="text-[10px] text-muted-foreground">Choose your Solana wallet</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Wallet options */}
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => connect(wallet.name)}
                    disabled={connecting}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/50 hover:bg-muted transition-all duration-200 group disabled:opacity-50"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wallet.color} flex items-center justify-center p-1.5 shrink-0`}>
                      <img src={wallet.icon} alt={wallet.name} className="w-full h-full object-contain rounded-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{wallet.name}</p>
                      <p className="text-[10px] text-muted-foreground">{wallet.description}</p>
                    </div>
                    {connecting && (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <p className="text-[10px] text-muted-foreground text-center mt-5">
                By connecting, you agree to Anturix Terms of Service
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
