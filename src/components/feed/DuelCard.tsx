import { motion } from 'framer-motion';
import { Users, Shield } from 'lucide-react';
import type { Duel } from '@/types/anturix';
import { AvatarWithRank, RankBadge, StreakBadge } from '@/components/gamification/RankSystem';
import { BanterChat } from '@/components/feed/BanterChat';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function PlayerRankLine({ rank, wins }: { rank: string; wins: number }) {
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
      className="glass-card glass-card-hover border-gradient-cyan-magenta card-scanline cyber-corners overflow-hidden transition-all duration-300 cursor-pointer"
    >
      <div className="cyber-corners-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-heading text-xs font-semibold text-foreground tracking-wider">{duel.title.toUpperCase()}</h3>
          <div className="flex items-center gap-2">
            {duel.status === 'active' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/15 border border-destructive/30">
                <div className="live-dot" />
                <span className="text-[10px] font-heading font-bold text-destructive tracking-wider">LIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Event */}
        <p className="px-4 text-[10px] text-muted-foreground font-medium tracking-wide">{duel.eventLabel}</p>

        {/* Bet amount */}
        <div className="text-center py-2">
          <span className="font-heading text-sm font-bold text-success">{duel.betAmount} SOL Social Pride Bet</span>
        </div>

        {/* VS Section */}
        <TooltipProvider>
          <div className="flex items-center justify-between px-4 py-3">
            {/* Challenger */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <AvatarWithRank src={challenger.avatar} rank={challenger.rank} />
              <span className="text-xs font-semibold text-foreground">{challenger.username}</span>
              <div className="flex items-center gap-1">
                <RankBadge rank={challenger.rank} />
                <StreakBadge streak={challenger.streak} />
              </div>
              {challenger.verified && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-[10px] text-success cursor-help">
                      <Shield className="w-3 h-3" /> {challenger.winRate}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-card border-border text-foreground">
                    <p className="text-xs">Verified win rate based on {challenger.wins + challenger.losses} total duels</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* VS */}
            <div className="px-4">
              <span className="font-heading text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glitch">
                VS
              </span>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <AvatarWithRank src={opponent.avatar} rank={opponent.rank} />
              <span className="text-xs font-semibold text-foreground">{opponent.username}</span>
              <div className="flex items-center gap-1">
                <RankBadge rank={opponent.rank} />
                <StreakBadge streak={opponent.streak} />
              </div>
              {opponent.penaltyActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-destructive font-medium cursor-help">⚠ Penalty</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-card border-border text-foreground">
                    <p className="text-xs">Player has a penalty for abandoning a previous duel</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </TooltipProvider>

        {/* Bottom bar */}
        <div className="px-4 pb-3 space-y-2">
          <TooltipProvider>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${duel.percentage.challenger}%` }} />
              <div className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-accent to-accent/70" style={{ width: `${duel.percentage.opponent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help"><Users className="w-3 h-3" /> {duel.communityBacking.challenger}</span>
                </TooltipTrigger>
                <TooltipContent className="bg-card border-border text-foreground">
                  <p className="text-xs">{duel.communityBacking.challenger} people backing the challenger</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-heading font-semibold text-foreground text-xs cursor-help">{duel.totalPool} SOL</span>
                </TooltipTrigger>
                <TooltipContent className="bg-card border-border text-foreground">
                  <p className="text-xs">Total pool value from both sides + community bets</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help">{duel.communityBacking.opponent} <Users className="w-3 h-3" /></span>
                </TooltipTrigger>
                <TooltipContent className="bg-card border-border text-foreground">
                  <p className="text-xs">{duel.communityBacking.opponent} people backing the opponent</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Banter Chat */}
        {duel.status === 'active' && <BanterChat />}
      </div>
    </motion.div>
  );
}
