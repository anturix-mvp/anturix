import { motion } from 'framer-motion';
import { Gem, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { PokerPool } from '@/types/anturix';

export function PokerPoolCard({ pool, index = 0 }: { pool: PokerPool; index?: number }) {
  const { authenticated, login } = useAuth();

  const handleJoin = () => {
    if (!authenticated) {
      login();
      return;
    }
    // proceed with join logic
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card glass-card-hover card-scanline cyber-corners overflow-hidden transition-all duration-300 cursor-pointer"
      style={{ boxShadow: '0 0 20px oklch(0.7 0.22 340 / 0.15)' }}
    >
      <div className="p-4 space-y-3 cyber-corners-bottom">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-bold text-foreground">{pool.title}</h3>
          <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold">
            {pool.status === 'open' ? 'OPEN' : 'FULL'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Seats: {pool.seats.occupied} / {pool.seats.total} occupied</p>
            <div className="flex items-center mt-1.5 -space-x-2">
              {pool.participants.slice(0, 4).map((p) => (
                <img key={p.id} src={p.avatar} alt={p.username} className="w-7 h-7 rounded-full border-2 border-background" />
              ))}
              {pool.participants.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                  +{pool.participants.length - 4}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-accent">
              <Gem className="w-4 h-4" />
              <span className="font-heading text-lg font-bold">{pool.buyIn}</span>
              <span className="text-xs text-muted-foreground">SOL</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Buy-in</p>
          </div>
        </div>

        <Button variant="magenta" className="w-full gap-2" onClick={handleJoin}>
          <Plus className="w-4 h-4" />
          TAKE SEAT ({pool.buyIn} SOL)
        </Button>
      </div>
    </motion.div>
  );
}
