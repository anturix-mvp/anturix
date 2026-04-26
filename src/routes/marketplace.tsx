import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ExpertLockCard } from "@/components/feed/ExpertLockCard";
import { mockPredictions } from "@/data/mockData";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Expert Marketplace — Anturix" },
      {
        name: "description",
        content: "Browse and unlock expert predictions on Anturix.",
      },
    ],
  }),
  component: MarketplacePage,
});

const sports = [
  "All",
  "Soccer",
  "NBA",
  "NFL",
  "MMA",
  "Crypto",
  "Esports",
] as const;

function MarketplacePage() {
  const [activeSport, setActiveSport] = useState<string>("All");
  const filtered =
    activeSport === "All"
      ? mockPredictions
      : mockPredictions.filter((p) => p.sport === activeSport);

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground mb-1">
          Expert Lock Marketplace
        </h1>
        <p className="text-sm text-muted-foreground">
          Unlock verified predictions from top Antalers
        </p>
      </div>
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {sports.map((sport) => (
          <button
            key={sport}
            onClick={() => setActiveSport(sport)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeSport === sport ? "bg-primary text-primary-foreground shadow-[0_0_12px_var(--color-primary)]" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {sport}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((prediction, i) => (
          <ExpertLockCard
            key={prediction.id}
            prediction={prediction}
            index={i}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No predictions in this category yet
        </div>
      )}
    </MainLayout>
  );
}
