import { createFileRoute } from '@tanstack/react-router';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { currentUser, mockAchievements } from '@/data/mockData';
import { Trophy, TrendingUp, Coins, Star, Swords, Shield } from 'lucide-react';
import { useState, useRef } from 'react';
import { RankBadge, XPProgressBar, StreakBadge } from '@/components/gamification/RankSystem';
import { showAchievementToast } from '@/components/gamification/AchievementToast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const Route = createFileRoute('/profile')({
  head: () => ({
    meta: [
      { title: 'Profile — Anturix' },
      { name: 'description', content: 'Your Anturix profile, stats, and achievements.' },
      { property: 'og:title', content: 'Profile — Anturix' },
      { property: 'og:description', content: 'View your Anturix betting stats and achievements.' },
    ],
  }),
  component: ProfilePage,
});

const profileTabs = ['Active Bets', 'History', 'Achievements', 'Alpha Locks'] as const;

const statTooltips: Record<string, string> = {
  'Total Wins': 'Number of duels and predictions you have won across all game modes',
  'Win Rate': 'Percentage of total bets you have won. Higher rates unlock better ranks',
  'SOL Earned': 'Total SOL earned from winning duels, predictions and pool payouts',
  'Reputation': 'Experience points earned from activity. Determines your rank progression',
  'Active Duels': 'Duels you are currently participating in that haven\'t been resolved yet',
};

const stats = [
  { icon: Trophy, label: 'Total Wins', value: currentUser.wins, color: 'text-gold' },
  { icon: TrendingUp, label: 'Win Rate', value: `${currentUser.winRate}%`, color: 'text-success' },
  { icon: Coins, label: 'SOL Earned', value: currentUser.totalEarnings.toLocaleString(), color: 'text-primary' },
  { icon: Star, label: 'Reputation', value: currentUser.reputationScore.toLocaleString(), color: 'text-accent' },
  { icon: Swords, label: 'Active Duels', value: currentUser.activeDuels, color: 'text-foreground' },
];

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<typeof profileTabs[number]>('Achievements');
  const coverRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const coverY = useTransform(scrollY, [0, 200], [0, 60]);
  const coverScale = useTransform(scrollY, [0, 200], [1, 1.15]);

  return (
    <MainLayout>
      {/* Cover with parallax */}
      <div className="relative h-32 rounded-xl overflow-hidden mb-16" ref={coverRef}>
        <motion.div
          style={{ y: coverY, scale: coverScale }}
          className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/20 to-success/20 origin-center"
        />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      {/* Avatar & Info */}
      <div className="relative -mt-24 px-4 mb-6">
        <div className={`w-24 h-24 rounded-full ${currentUser.rank === 'Legend' ? 'rank-legend-avatar' : ''}`}>
          <img
            src={currentUser.avatar}
            alt={currentUser.username}
            className={`w-24 h-24 rounded-full border-4 ${currentUser.rank === 'Legend' ? 'border-transparent' : 'border-gold'} shadow-[0_0_20px_oklch(0.82_0.16_85/0.4)]`}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <h1 className="font-heading text-xl font-bold text-foreground">{currentUser.username}</h1>
          <RankBadge rank={currentUser.rank} />
          <StreakBadge streak={currentUser.streak} />
          {currentUser.verified && <Shield className="w-4 h-4 text-success" />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Joined {currentUser.joinDate}</p>
        <div className="mt-2 max-w-xs">
          <XPProgressBar rank={currentUser.rank} size="md" />
        </div>
      </div>

      {/* Stats with tooltips */}
      <TooltipProvider>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {stats.map((stat, i) => (
            <Tooltip key={stat.label}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-3 text-center cursor-help"
                >
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  <p className="font-heading text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border text-foreground max-w-[200px]">
                <p className="text-xs">{statTooltips[stat.label]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {profileTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* Achievements */}
      {activeTab === 'Achievements' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mockAchievements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card p-4 text-center cursor-pointer hover:scale-105 transition-transform ${a.earned ? '' : 'opacity-40'}`}
              onClick={() => a.earned && showAchievementToast(a)}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <p className="font-heading text-xs font-bold text-foreground">{a.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{a.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab !== 'Achievements' && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No {activeTab.toLowerCase()} yet
        </div>
      )}
    </MainLayout>
  );
}
