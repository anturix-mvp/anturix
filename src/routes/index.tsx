import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DuelCard } from '@/components/feed/DuelCard';
import { ExpertLockCard } from '@/components/feed/ExpertLockCard';
import { PokerPoolCard } from '@/components/feed/PokerPoolCard';
import { SwipeableCard } from '@/components/feed/SwipeableCard';
import { PullToRefresh } from '@/components/feed/PullToRefresh';
import { mockFeed, myBetsFeed, discoverFeed } from '@/data/mockData';

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
  const [animating, setAnimating] = useState(false);
  const [displayTab, setDisplayTab] = useState<typeof tabs[number]>('Feed');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleTabChange = (tab: typeof tabs[number]) => {
    if (tab === activeTab) return;
    setAnimating(true);
    // After fade out, switch content and fade in
    timeoutRef.current = setTimeout(() => {
      setActiveTab(tab);
      setDisplayTab(tab);
      setAnimating(false);
    }, 200);
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const activeFeed = activeTab === 'My Bets' ? myBetsFeed : activeTab === 'Discover' ? discoverFeed : mockFeed;

  const tabCounts: Record<typeof tabs[number], number> = {
    'Feed': mockFeed.length,
    'My Bets': myBetsFeed.length,
    'Discover': discoverFeed.length,
  };

  return (
    <MainLayout>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative flex items-center gap-1.5 ${
              activeTab === tab
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {tabCounts[tab]}
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_8px_var(--color-primary)]" />
            )}
          </button>
        ))}
      </div>

      {/* Feed with pull-to-refresh */}
      <PullToRefresh>
        <div className={`space-y-4 transition-all duration-200 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
          {activeFeed.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No hay items aquí todavía</p>
              <p className="text-sm mt-1">¡Crea tu primera apuesta!</p>
            </div>
          ) : (
            activeFeed.map((item, i) => {
              let card: React.ReactNode;
              switch (item.type) {
                case 'duel':
                  card = <DuelCard key={item.data.id} duel={item.data} index={i} />;
                  break;
                case 'prediction':
                  card = <ExpertLockCard key={item.data.id} prediction={item.data} index={i} />;
                  break;
                case 'pool':
                  card = <PokerPoolCard key={item.data.id} pool={item.data} index={i} />;
                  break;
              }
              return (
                <SwipeableCard key={item.data.id}>
                  {card}
                </SwipeableCard>
              );
            })
          )}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
}
