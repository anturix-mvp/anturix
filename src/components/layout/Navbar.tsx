import { Bell, Plus, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WalletDropdown } from "@/components/wallet/WalletDropdown";
import { useAuth } from "@/hooks/useAuth";
import { CreateBetModal } from "@/components/bet/CreateBetModal";
import {
  XPProgressBar,
  StreakBadge,
} from "@/components/gamification/RankSystem";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { currentUser } from "@/data/mockData";
import atxLogo from "@/assets/atx-logo.jpg";
import {
  Globe,
  Swords,
  Lock,
  ChevronDown,
  Bot,
  Dice1,
  Trophy as TrophyIcon,
  Network,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  {
    id: "crypto",
    label: "PUBLIC ARENA",
    subtitle: "PHASE 1 — ACTIVE",
    status: "active",
    items: [
      { to: "/arena", label: "EXPLORE MARKETS", icon: Globe },
      { to: "/", label: "PRIVATE DUELS", icon: Swords },
    ],
  },
  {
    id: "ai",
    label: "AI AGENTS",
    toastMessage: "AI Agent Swarm coming in Phase 2 🤖",
    status: "soon",
    icon: Bot,
    badge: "PHASE 2",
  },
  {
    id: "casino",
    label: "CASINO",
    toastMessage: "Social Casino coming in Phase 3 🃏",
    status: "soon",
    icon: Dice1,
    badge: "PHASE 3",
  },
  {
    id: "sports",
    label: "SPORTS",
    toastMessage: "Sportsbook coming in Phase 4 🏈",
    status: "soon",
    icon: TrophyIcon,
    badge: "PHASE 4",
  },
  {
    id: "oracle",
    label: "ORACLE",
    toastMessage: "Oracle Marketplace coming in Phase 5 🔮",
    status: "soon",
    icon: Network,
    badge: "PHASE 5",
  },
];

export function Navbar() {
  const { authenticated } = useAuth();
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [publicArenaOpen, setPublicArenaOpen] = useState(false);
  const roadmapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        roadmapRef.current &&
        !roadmapRef.current.contains(event.target as Node)
      ) {
        setPublicArenaOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl px-4">
        <div className="h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 group mr-4 shrink-0">
            <span className="font-heading font-black text-xl tracking-[0.3em] italic text-primary group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all">
              ANTURIX
            </span>
          </Link>

          {/* Horizontal Roadmap Navigation */}
          <nav className="hidden lg:flex items-center gap-1 mx-4 h-full overflow-visible whitespace-nowrap max-w-full">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                ref={cat.id === "crypto" ? roadmapRef : undefined}
                className="relative h-full flex items-center px-2 min-w-0 max-w-[180px] overflow-visible"
              >
                <div className="relative group inline-block overflow-visible">
                  <button
                    type="button"
                    className={`flex flex-col justify-center cursor-pointer transition-all min-w-0 overflow-visible ${cat.status === "soon" ? "opacity-50 grayscale-[0.8] cursor-not-allowed" : "hover:text-primary"}`}
                    onClick={
                      cat.id === "crypto"
                        ? () => setPublicArenaOpen((value) => !value)
                        : cat.status === "soon"
                          ? () => toast(cat.toastMessage)
                          : undefined
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
                      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis max-w-[110px]">
                        {cat.label}
                      </span>
                      {cat.items && (
                        <ChevronDown
                          className={`w-3 h-3 shrink-0 transition-transform ${cat.id === "crypto" ? (publicArenaOpen ? "rotate-180 text-primary" : "text-muted-foreground") : "text-muted-foreground group-hover:text-primary group-hover:rotate-180"}`}
                        />
                      )}
                      {cat.status === "soon" && (
                        <span
                          className={`text-[6px] font-black px-1 py-0.5 rounded whitespace-nowrap shrink-0 ${cat.id === "ai" ? "border border-primary/40 text-primary/80" : "bg-muted border border-border text-muted-foreground"}`}
                        >
                          {cat.badge}
                        </span>
                      )}
                    </div>
                  </button>

                  {cat.id === "crypto" && publicArenaOpen && (
                    <div className="absolute top-[100%] left-0 mt-2 z-50 w-72 overflow-visible">
                      <div className="rounded-xl border border-cyan-500/20 bg-gray-900/95 shadow-xl shadow-cyan-500/10 backdrop-blur-xl p-2">
                        {cat.items?.map((item, index) => (
                          <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setPublicArenaOpen(false)}
                            className={`flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-cyan-500/10 ${index === 0 ? "mb-1" : ""}`}
                          >
                            <item.icon className="mt-0.5 w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-widest text-foreground">
                                {item.label === "EXPLORE MARKETS"
                                  ? "Explore Markets"
                                  : "Private Duels"}
                              </p>
                              <p className="text-[10px] leading-relaxed text-muted-foreground mt-0.5">
                                {item.label === "EXPLORE MARKETS"
                                  ? "Browse all prediction markets"
                                  : "Create a 1v1 invite-only duel"}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.status === "soon" && (
                    <div className="absolute top-[calc(100%+8px)] left-1/2 z-[9999] w-52 max-w-[14rem] -translate-x-1/2 opacity-0 invisible translate-y-2 transition-opacity duration-150 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                      <div className="overflow-hidden rounded-lg border border-cyan-500/30 bg-gray-900/95 p-3 shadow-xl shadow-cyan-500/10 backdrop-blur-xl text-left">
                        <p className="mb-1 text-xs font-bold text-cyan-400">
                          {cat.id === "ai"
                            ? "PHASE 2"
                            : cat.id === "casino"
                              ? "PHASE 3"
                              : cat.id === "sports"
                                ? "PHASE 4"
                                : "PHASE 5"}
                        </p>
                        <p className="text-xs leading-snug text-gray-400 whitespace-normal break-words">
                          {cat.id === "ai"
                            ? "AI Oracles · Sentiment Analysis · Autonomous Market Makers"
                            : cat.id === "casino"
                              ? "Poker · Blackjack · Conquian — Provably fair via VRF"
                              : cat.id === "sports"
                                ? "UFC · NFL · eSports — Auto-resolved by sports oracles"
                                : "Create oracle feeds · Expert marketplace · SocialFi rep"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Underline */}
                {cat.status === "active" && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
                )}
              </div>
            ))}
          </nav>

          {/* Search */}
          <div className="hidden xl:flex flex-1 max-w-[240px] ml-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-4 rounded-lg bg-muted/30 border border-border/30 text-[10px] tracking-widest uppercase font-black text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="hidden sm:flex relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            <div className="hidden sm:block">
              <StreakBadge streak={currentUser.streak} />
            </div>

            <Button
              variant="cyan"
              size="sm"
              className="hidden sm:flex gap-1.5 font-black uppercase tracking-widest bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,255,0.4)] px-4 h-9"
              onClick={() => setBetModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>CREATE DUEL</span>
            </Button>

            <WalletDropdown />

            {/* Avatar with XP bar */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center">
                    <div className="relative">
                      <img
                        src={currentUser.avatar}
                        alt="avatar"
                        className={`w-8 h-8 rounded-full border-2 ${currentUser.rank === "Legend" ? "rank-legend-avatar border-transparent" : "border-primary"}`}
                      />
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${authenticated ? "bg-success" : "bg-destructive"}`}
                      />
                    </div>
                    <div className="w-10 mt-0.5">
                      <XPProgressBar rank={currentUser.rank} size="sm" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-card border-border text-foreground"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">
                      {currentUser.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Rank: {currentUser.rank} ·{" "}
                      {currentUser.reputationScore.toLocaleString()} XP
                    </p>
                    <XPProgressBar rank={currentUser.rank} size="md" />
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <CreateBetModal
        open={betModalOpen}
        onClose={() => setBetModalOpen(false)}
      />
    </>
  );
}
