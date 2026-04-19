import { mockDuels, leaderboardUsers } from '@/data/mockData';
import { TrendingUp, Crown, Flame } from 'lucide-react';

export function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col w-72 h-screen sticky top-14 p-4 space-y-4 overflow-y-auto">
      {/* Trending Duels */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-accent" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Trending Duels</h3>
        </div>
        <div className="space-y-2">
          {mockDuels.slice(0, 3).map((duel) => (
            <div key={duel.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{duel.eventLabel}</p>
                <p className="text-[10px] text-muted-foreground">{duel.betAmount} SOL</p>
              </div>
              <TrendingUp className="w-3 h-3 text-success shrink-0 ml-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Antalers */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold" />
            <h3 className="font-heading text-sm font-semibold text-foreground">Top Antalers</h3>
          </div>
          <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            LIVE AFTER LAUNCH
          </span>
        </div>

        <div className="space-y-2">
          {leaderboardUsers.slice(0, 5).map((user, i) => (
            <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <span className={`font-heading text-xs font-bold w-5 ${i === 0 ? 'text-gold' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-accent' : 'text-muted-foreground'}`}>
                #{i + 1}
              </span>
              <img src={user.avatar} alt={user.username} className="w-6 h-6 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.username}</p>
                <p className="text-[10px] text-muted-foreground">{user.totalEarnings.toLocaleString()} SOL</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Events */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Live Events</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/50">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Oracle Feeds coming in Phase 1
              </span>
              <p className="text-[10px] font-bold text-foreground">Lakers vs Celtics · MMA · UFC</p>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
