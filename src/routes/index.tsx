import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DuelCard } from '@/components/feed/DuelCard';
import { ExpertLockCard } from '@/components/feed/ExpertLockCard';
import { PokerPoolCard } from '@/components/feed/PokerPoolCard';
import { mockFeed } from '@/data/mockData';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Anturix — Back Your Words. Bet Your SOL.' },
      { name: 'description', content: 'The ultimate SocialFi Prediction Market on Solana. 1v1 duels, expert predictions, and poker pools.' },
      { property: 'og:title', content: 'Anturix — Back Your Words. Bet Your SOL.' },
      { property: 'og:description', content: 'The ultimate SocialFi Prediction Market on Solana.' },
    ],
  }),
  component: FeedPage,
});

const tabs = ['Feed', 'My Bets', 'Discover'] as const;

function FeedPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Feed');

  return (
    <MainLayout>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === tab
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_8px_var(--color-primary)]" />
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {mockFeed.map((item, i) => {
          switch (item.type) {
            case 'duel':
              return <DuelCard key={item.data.id} duel={item.data} index={i} />;
            case 'prediction':
              return <ExpertLockCard key={item.data.id} prediction={item.data} index={i} />;
            case 'pool':
              return <PokerPoolCard key={item.data.id} pool={item.data} index={i} />;
          }
        })}
      </div>
    </MainLayout>
  );
}
