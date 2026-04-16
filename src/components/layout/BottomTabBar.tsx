import { Link, useLocation } from "@tanstack/react-router";
import { Home, Plus, Settings, Swords } from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CreateBetModal } from "@/components/bet/CreateBetModal";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/", icon: Plus, label: "Create", fab: true },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to;
          if ("fab" in tab && tab.fab) {
            return (
              <button
                key={tab.label}
                onClick={() => setBetModalOpen(true)}
                className="relative w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg fab-glow"
              >
                <Plus className="w-7 h-7 text-primary-foreground" />
              </button>
            );
          }
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <CreateBetModal
        open={betModalOpen}
        onClose={() => setBetModalOpen(false)}
      />
    </>
  );
}
