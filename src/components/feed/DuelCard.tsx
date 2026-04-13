import { motion } from 'framer-motion';
import { Users, Shield } from 'lucide-react';
import type { Duel } from '@/types/anturix';

function RankBadge({ rank, wins }: { rank: string; wins: number }) {
  return (
    <span className="text-[10px] text-muted-foreground">
      {rank} · {wins} Wins
    </span>
  );
}

export function DuelCard({ duel, index = 0 }: { duel: Duel; index?: number }) {
  const { challenger, opponent } = duel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card glass-card-hover border-gradient-cyan-magenta overflow-hidden transition-all duration-300 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-heading text-xs font-semibold text-foreground tracking-wider">{duel.title.toUpperCase()}</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-[10px] font-semibold text-destructive">Banter Active</span>
        </div>
      </div>

      {/* Event */}
      <p className="px-4 text-[10px] text-muted-foreground font-medium tracking-wide">{duel.eventLabel}</p>

      {/* Bet amount */}
      <div className="text-center py-2">
        <span className="font-heading text-sm font-bold text-success">{duel.betAmount} SOL Social Pride Bet</span>
      </div>

      {/* VS Section */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Challenger */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <img src={challenger.avatar} alt={challenger.username} className="w-14 h-14 rounded-full border-2 border-primary" />
          <span className="text-xs font-semibold text-foreground">{challenger.username}</span>
          <RankBadge rank={challenger.rank} wins={challenger.wins} />
          {challenger.verified && (
            <span className="flex items-center gap-0.5 text-[10px] text-success">
              <Shield className="w-3 h-3" /> {challenger.winRate}% Success
            </span>
          )}
        </div>

        {/* VS */}
        <div className="px-4">
          <span className="font-heading text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse-glow">
            VS
          </span>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <img src={opponent.avatar} alt={opponent.username} className="w-14 h-14 rounded-full border-2 border-accent" />
          <span className="text-xs font-semibold text-foreground">{opponent.username}</span>
          <RankBadge rank={opponent.rank} wins={opponent.wins} />
          {opponent.penaltyActive && (
            <span className="text-[10px] text-destructive font-medium">⚠ Penalty Active</span>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 pb-4 space-y-2">
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${duel.percentage.challenger}%` }} />
          <div className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-accent to-accent/70" style={{ width: `${duel.percentage.opponent}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {duel.communityBacking.challenger}</span>
          <span className="font-heading font-semibold text-foreground text-xs">{duel.totalPool} SOL</span>
          <span className="flex items-center gap-1">{duel.communityBacking.opponent} <Users className="w-3 h-3" /></span>
        </div>
      </div>
    </motion.div>
  );
}
