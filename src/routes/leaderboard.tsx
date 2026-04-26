import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { leaderboardUsers } from "@/data/mockData";
import { Crown, Flame } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Anturix" },
      {
        name: "description",
        content: "Top Antalers ranked by performance on Anturix.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const filters = ["This Week", "This Month", "All Time"] as const;
const rankColors: Record<string, string> = {
  Legend: "text-gold border-gold",
  Expert: "text-primary border-primary",
  Pro: "text-accent border-accent",
  Novice: "text-muted-foreground border-muted",
};

function LeaderboardPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All Time");
  const top3 = leaderboardUsers.slice(0, 3);
  const rest = leaderboardUsers.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumHeights = ["h-28", "h-36", "h-24"];
  const podiumLabels = ["2nd", "1st", "3rd"];

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground mb-1">
          Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Top Antalers ranked by total earnings
        </p>
      </div>
      <div className="flex items-center gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="sm:hidden mb-8">
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
          {top3.map((user, i) => {
            const medals = ["🥇", "🥈", "🥉"];
            const glows = ["glow-gold", "glow-cyan", "glow-magenta"];
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.12 }}
                className="snap-center shrink-0 w-[75vw] glass-card cyber-corners p-5 flex flex-col items-center gap-2"
              >
                <div className="cyber-corners-bottom w-full flex flex-col items-center">
                  <span className="text-3xl mb-1">{medals[i]}</span>
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className={`w-20 h-20 rounded-full border-2 ${i === 0 ? "border-gold" : i === 1 ? "border-muted-foreground" : "border-accent"} ${glows[i]}`}
                  />
                  <p className="font-heading text-sm font-bold text-foreground mt-2">
                    {user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.totalEarnings.toLocaleString()} SOL
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-success font-semibold">
                      {user.winRate}% WR
                    </span>
                    {user.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-gold">
                        <Flame className="w-3 h-3" /> {user.streak}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="hidden sm:flex items-end justify-center gap-3 mb-8">
        {podiumOrder.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-2">
              {i === 1 && (
                <Crown className="w-6 h-6 text-gold absolute -top-4 left-1/2 -translate-x-1/2" />
              )}
              <img
                src={user.avatar}
                alt={user.username}
                className={`w-16 h-16 rounded-full border-2 ${i === 1 ? "border-gold w-20 h-20" : i === 0 ? "border-muted-foreground" : "border-accent"}`}
              />
            </div>
            <p className="text-xs font-semibold text-foreground truncate max-w-[80px]">
              {user.username}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {user.totalEarnings.toLocaleString()} SOL
            </p>
            <div
              className={`${podiumHeights[i]} w-20 rounded-t-lg bg-gradient-to-t ${i === 1 ? "from-gold/20 to-gold/5" : i === 0 ? "from-muted/30 to-muted/5" : "from-accent/20 to-accent/5"} mt-2 flex items-start justify-center pt-2`}
            >
              <span className="font-heading text-xs font-bold text-muted-foreground">
                {podiumLabels[i]}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] sm:grid-cols-[3rem_1fr_5rem_6rem_5rem_4rem] items-center gap-2 px-4 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>#</span>
          <span>Player</span>
          <span>Win %</span>
          <span>Earnings</span>
          <span className="hidden sm:block">Streak</span>
          <span>Rank</span>
        </div>
        {rest.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] sm:grid-cols-[3rem_1fr_5rem_6rem_5rem_4rem] items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50"
          >
            <span className="font-heading text-sm font-bold text-muted-foreground">
              #{i + 4}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-full shrink-0"
              />
              <span className="text-sm font-medium text-foreground truncate">
                {user.username}
              </span>
            </div>
            <span className="text-sm text-success font-medium">
              {user.winRate}%
            </span>
            <span className="text-sm font-heading font-semibold text-foreground">
              {user.totalEarnings.toLocaleString()}
            </span>
            <div className="hidden sm:flex items-center gap-1">
              {user.streak > 0 ? (
                <>
                  <Flame className="w-3 h-3 text-gold" />
                  <span className="text-xs text-gold font-semibold">
                    {user.streak}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <span
              className={`text-[10px] font-heading font-bold ${rankColors[user.rank] || "text-muted-foreground"}`}
            >
              {user.rank}
            </span>
          </motion.div>
        ))}
      </div>
    </MainLayout>
  );
}
