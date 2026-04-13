import type { RankTier } from '@/types/anturix';

const rankConfig: Record<RankTier, { color: string; borderClass: string; bgClass: string; glowClass: string }> = {
  Novice: { color: 'text-muted-foreground', borderClass: 'border-muted-foreground', bgClass: 'bg-muted-foreground/20', glowClass: '' },
  Pro: { color: 'text-primary', borderClass: 'border-primary', bgClass: 'bg-primary/20', glowClass: 'glow-cyan' },
  Expert: { color: 'text-gold', borderClass: 'border-gold', bgClass: 'bg-gold/20', glowClass: 'glow-gold' },
  Legend: { color: 'text-foreground', borderClass: 'border-transparent', bgClass: 'bg-gradient-to-r from-primary/20 via-accent/20 to-gold/20', glowClass: '' },
};

// XP thresholds per rank
const rankXP: Record<RankTier, { current: number; max: number; next: RankTier | null }> = {
  Novice: { current: 320, max: 1000, next: 'Pro' },
  Pro: { current: 2800, max: 5000, next: 'Expert' },
  Expert: { current: 9800, max: 15000, next: 'Legend' },
  Legend: { current: 18000, max: 20000, next: null },
};

export function getRankStyle(rank: RankTier) {
  return rankConfig[rank] || rankConfig.Novice;
}

export function getRankXP(rank: RankTier) {
  return rankXP[rank] || rankXP.Novice;
}

export function RankBadge({ rank }: { rank: RankTier }) {
  const style = getRankStyle(rank);
  const isLegend = rank === 'Legend';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-bold ${style.color} ${style.bgClass} ${isLegend ? 'rank-legend' : ''}`}>
      {rank.toUpperCase()}
    </span>
  );
}

export function XPProgressBar({ rank, size = 'sm' }: { rank: RankTier; size?: 'sm' | 'md' }) {
  const xp = getRankXP(rank);
  const pct = Math.min((xp.current / xp.max) * 100, 100);
  const h = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className="w-full">
      <div className={`w-full ${h} rounded-full bg-muted overflow-hidden`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {size === 'md' && (
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-muted-foreground">{xp.current.toLocaleString()} XP</span>
          <span className="text-[9px] text-muted-foreground">{xp.next ? `Next: ${xp.next}` : 'MAX'}</span>
        </div>
      )}
    </div>
  );
}

export function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gold/15 border border-gold/30">
      <span className="text-xs">🔥</span>
      <span className="text-[10px] font-heading font-bold text-gold">{streak}</span>
    </div>
  );
}

export function AvatarWithRank({ src, rank, size = 'md' }: { src: string; rank: RankTier; size?: 'sm' | 'md' | 'lg' }) {
  const style = getRankStyle(rank);
  const isLegend = rank === 'Legend';
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div className={`relative ${isLegend ? 'rank-legend-avatar' : ''}`}>
      <img
        src={src}
        alt="avatar"
        className={`${sizeClass} rounded-full border-2 ${isLegend ? 'border-transparent' : style.borderClass}`}
      />
    </div>
  );
}
