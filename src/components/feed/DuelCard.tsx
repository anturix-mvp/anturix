import { motion } from 'framer-motion';
import { Users, Shield } from 'lucide-react';
import type { Duel, CryptoCondition } from '@/types/anturix';
import { AvatarWithRank, RankBadge, StreakBadge } from '@/components/gamification/RankSystem';
import { BanterChat } from '@/components/feed/BanterChat';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ASSET_ICONS: Record<string, string> = {
  SOL: '◎',
  BTC: '₿',
  ETH: 'Ξ',
};

const CONDITION_CONFIG: Record<CryptoCondition, { emoji: string; label: string; pillBg: string; pillText: string; pillBorder: string }> = {
  above: { emoji: '🔼', label: 'Above', pillBg: 'bg-emerald-500/15', pillText: 'text-emerald-400', pillBorder: 'border-emerald-500/30' },
  below: { emoji: '🔽', label: 'Below', pillBg: 'bg-red-500/15', pillText: 'text-red-400', pillBorder: 'border-red-500/30' },
  even: { emoji: '🎲', label: 'EVEN', pillBg: 'bg-purple-500/15', pillText: 'text-purple-400', pillBorder: 'border-purple-500/30' },
  odd: { emoji: '🎲', label: 'ODD', pillBg: 'bg-violet-500/15', pillText: 'text-violet-400', pillBorder: 'border-violet-500/30' },
  first_to: { emoji: '🏁', label: 'Race', pillBg: 'bg-amber-500/15', pillText: 'text-amber-400', pillBorder: 'border-amber-500/30' },
  one_touch: { emoji: '💥', label: 'One Touch', pillBg: 'bg-orange-500/15', pillText: 'text-orange-400', pillBorder: 'border-orange-500/30' },
};

function CryptoConditionPills({ duel }: { duel: Duel }) {
  const crypto = duel.crypto;
  if (!crypto) return null;

  const cond = CONDITION_CONFIG[crypto.condition];
  const assetIcon = ASSET_ICONS[crypto.asset] || crypto.asset;
  const isRace = crypto.condition === 'first_to';
  const isDigit = crypto.condition === 'even' || crypto.condition === 'odd';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="px-4 pb-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Asset pill */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-[11px] font-heading font-bold text-primary">
          {assetIcon} {crypto.asset}
        </span>

        <span className="text-muted-foreground text-[10px]">+</span>

        {/* Condition pill */}
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-heading font-bold ${cond.pillBg} ${cond.pillText} ${cond.pillBorder}`}>
          {cond.emoji} {cond.label}
        </span>

        {/* Target / specifics */}
        {crypto.targetPrice && !isRace && (
          <>
            <span className="text-muted-foreground text-[10px]">+</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 border border-border text-[11px] font-heading font-bold text-foreground">
              💰 ${crypto.targetPrice.toLocaleString()}
            </span>
          </>
        )}

        {/* Race: show both assets */}
        {isRace && crypto.assetB && (
          <>
            <span className="text-muted-foreground text-[10px]">vs</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/30 text-[11px] font-heading font-bold text-accent">
              {ASSET_ICONS[crypto.assetB] || crypto.assetB} {crypto.assetB}
            </span>
          </>
        )}

        {/* Digit bet: show time */}
        {isDigit && crypto.expiresLabel && (
          <>
            <span className="text-muted-foreground text-[10px]">+</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 border border-border text-[11px] font-heading font-bold text-foreground">
              ⏱️ {crypto.expiresLabel}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}

function PlayerRankLine({ rank, wins }: { rank: string; wins: number }) {
  return (
    <span className="text-[10px] text-muted-foreground">
      {rank} · {wins} Wins
    </span>
  );
}

export function DuelCard({ duel, index = 0 }: { duel: Duel; index?: number }) {
  const { challenger, opponent } = duel;
  const hasCrypto = !!duel.crypto;
  const condConfig = duel.crypto ? CONDITION_CONFIG[duel.crypto.condition] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-card glass-card-hover border-gradient-cyan-magenta card-scanline cyber-corners overflow-hidden transition-all duration-300 cursor-pointer"
    >
      <div className="cyber-corners-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {hasCrypto && condConfig && (
              <span className="text-base">{condConfig.emoji}</span>
            )}
            <h3 className="font-heading text-xs font-semibold text-foreground tracking-wider">{duel.title.toUpperCase()}</h3>
          </div>
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

        {/* Crypto condition pills */}
        {hasCrypto && (
          <div className="pt-2">
            <CryptoConditionPills duel={duel} />
          </div>
        )}

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
