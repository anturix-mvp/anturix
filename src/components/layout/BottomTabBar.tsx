import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  User,
  Plus,
  Rss,
  Globe,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CreateBetModal } from "@/components/bet/CreateBetModal";

import { MarketBuilderModal } from "@/components/arena/MarketBuilderModal";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/arena", icon: Globe, label: "Arena" },
  { to: "/", icon: Plus, label: "Create", fab: true },
  { to: "/feed", icon: Rss, label: "Feed" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [builderModalOpen, setBuilderModalOpen] = useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to;
          if ("fab" in tab && tab.fab) {
            return (
              <button
                key={tab.label}
                onClick={() => setIsDrawerOpen(true)}
                className="relative w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg fab-glow group active:scale-95 transition-transform"
              >
                <Plus className={cn("w-7 h-7 text-primary-foreground transition-transform", isDrawerOpen && "rotate-45")} />
              </button>
            );
          }
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all ${active ? "text-primary scale-110" : "text-muted-foreground active:scale-90"}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-card border-border px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-heading font-black text-sm tracking-[0.2em] text-foreground uppercase">
              Start Creation
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                setBetModalOpen(true);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                <Swords className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-black text-xs uppercase tracking-widest text-foreground">
                  Create 1v1 Duel
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  Private arena prediction
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsDrawerOpen(false);
                setBuilderModalOpen(true);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(255,0,255,0.2)]">
                <Globe className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-black text-xs uppercase tracking-widest text-foreground">
                  Create Public Market
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  Global permissionless arena
                </p>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <CreateBetModal
        open={betModalOpen}
        onClose={() => setBetModalOpen(false)}
      />

      <MarketBuilderModal
        open={builderModalOpen}
        onClose={() => setBuilderModalOpen(false)}
      />
    </>
  );
}
