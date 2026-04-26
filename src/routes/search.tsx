import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search as SearchIcon } from "lucide-react";
import { mockUsers, mockDuels, mockPredictions } from "@/data/mockData";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Anturix" },
      {
        name: "description",
        content: "Search users, duels, and predictions on Anturix.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const filteredUsers =
    query.length >= 2
      ? mockUsers.filter((u) =>
          u.username.toLowerCase().includes(query.toLowerCase()),
        )
      : [];
  const filteredDuels =
    query.length >= 2
      ? mockDuels.filter((d) =>
          d.eventLabel.toLowerCase().includes(query.toLowerCase()),
        )
      : [];
  const filteredPredictions =
    query.length >= 2
      ? mockPredictions.filter((p) =>
          p.eventLabel.toLowerCase().includes(query.toLowerCase()),
        )
      : [];
  const hasResults =
    filteredUsers.length > 0 ||
    filteredDuels.length > 0 ||
    filteredPredictions.length > 0;

  return (
    <MainLayout>
      <h1 className="text-xl font-heading font-bold text-foreground mb-6">
        Search
      </h1>
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, duels, predictions..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
      </div>
      {query.length < 2 && (
        <div className="text-center py-12 text-muted-foreground">
          <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}
      {query.length >= 2 && !hasResults && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No results</p>
          <p className="text-sm mt-1">Nothing found for "{query}"</p>
        </div>
      )}
      {filteredUsers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-heading font-bold text-muted-foreground mb-3 tracking-wider">
            USERS
          </h2>
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border-2 border-primary"
                />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.rank} · {user.winRate}% WR
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {filteredDuels.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-heading font-bold text-muted-foreground mb-3 tracking-wider">
            DUELS
          </h2>
          <div className="space-y-2">
            {filteredDuels.map((duel) => (
              <div
                key={duel.id}
                className="p-3 rounded-xl bg-card border border-border"
              >
                <p className="text-sm font-bold text-foreground">
                  {duel.eventLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {duel.betAmount} SOL · Pool: {duel.totalPool} SOL
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {filteredPredictions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-heading font-bold text-muted-foreground mb-3 tracking-wider">
            PREDICTIONS
          </h2>
          <div className="space-y-2">
            {filteredPredictions.map((pred) => (
              <div
                key={pred.id}
                className="p-3 rounded-xl bg-card border border-border"
              >
                <p className="text-sm font-bold text-foreground">
                  {pred.eventLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  By {pred.expert.username} · {pred.unlockPrice} SOL
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
