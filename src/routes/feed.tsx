import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout/MainLayout";
import { DuelCard } from "@/components/feed/DuelCard";
import { ExpertLockCard } from "@/components/feed/ExpertLockCard";
import { PokerPoolCard } from "@/components/feed/PokerPoolCard";
import { SwipeableCard } from "@/components/feed/SwipeableCard";
import { PullToRefresh } from "@/components/feed/PullToRefresh";
import { mockFeed } from "@/data/mockData";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Anturix" },
      {
        name: "description",
        content:
          "Explore the latest duels, predictions, and pools on Anturix.",
      },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return (
    <MainLayout>
      <h1 className="text-xl font-heading font-bold text-foreground mb-6">
        Feed
      </h1>
      <PullToRefresh>
        <div className="space-y-4">
          {mockFeed.map((item, i) => {
            let card: React.ReactNode;
            switch (item.type) {
              case "duel":
                card = (
                  <DuelCard key={item.data.id} duel={item.data} index={i} />
                );
                break;
              case "prediction":
                card = (
                  <ExpertLockCard
                    key={item.data.id}
                    prediction={item.data}
                    index={i}
                  />
                );
                break;
              case "pool":
                card = (
                  <PokerPoolCard
                    key={item.data.id}
                    pool={item.data}
                    index={i}
                  />
                );
                break;
            }
            return <SwipeableCard key={item.data.id}>{card}</SwipeableCard>;
          })}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
}
