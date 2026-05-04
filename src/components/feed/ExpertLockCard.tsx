import { motion } from 'framer-motion';
import { Lock, Shield, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { Prediction, User } from '@/types/anturix';

export function ExpertLockCard({ prediction, index = 0 }: { prediction: Prediction; index?: number }) {
  const expert = prediction.expert as User;
  const { authenticated, login } = useAuth();

  const handleUnlock = () => {
    if (!authenticated) {
      login();
      return;
    }
    // proceed with unlock logic
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card glass-card-hover card-scanline cyber-corners overflow-hidden transition-all duration-300 cursor-pointer"
    >
      <div className="p-4 space-y-3 cyber-corners-bottom">
        <div className="flex items-center gap-3">
          <img src={expert.avatar} alt={expert.username} className="w-10 h-10 rounded-full border-2 border-gold" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">{expert.username}</span>
              {expert.verified && <Shield className="w-3.5 h-3.5 text-success" />}
              {prediction.hotStreak && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-semibold">
                  <Flame className="w-3 h-3" /> Hot
                </span>
              )}
            </div>
            <span className="text-[10px] text-success font-medium">{expert.winRate}% Success Rate</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-heading font-semibold">
            {expert.rank.toUpperCase()}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground">{prediction.eventLabel}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{prediction.odds}</p>
        </div>

        <Button variant="cyan" className="w-full gap-2" onClick={handleUnlock}>
          <Lock className="w-4 h-4" />
          UNLOCK PREDICTION ({prediction.unlockPrice} SOL)
        </Button>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Expert on-chain verified · {prediction.pastPerfect} perfect predictions</span>
        </div>
      </div>
    </motion.div>
  );
}
