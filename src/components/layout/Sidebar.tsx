import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  Rss,
  Search,
  Users,
  Trophy,
  Calendar,
  Settings,
  ChevronRight,
  Globe,
  Lock,
  Coins,
  Sparkles,
  LayoutDashboard,
  Database,
  Swords,
} from "lucide-react";
import { useEffect, useState } from "react";
import atxLogo from "@/assets/atx-logo.jpg";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/feed", icon: Rss, label: "Feed" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/friends", icon: Users, label: "Friends" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const updateCollapsed = () => {
      setCollapsed(window.innerWidth < 1280);
    };

    updateCollapsed();
    window.addEventListener("resize", updateCollapsed);
    return () => window.removeEventListener("resize", updateCollapsed);
  }, []);

  return (
    <aside
      className={`hidden md:flex flex-col h-screen overflow-y-auto overflow-x-hidden flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}
    >
      <div className="p-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-2 group ${collapsed ? "justify-center w-full" : ""}`}
        >
          <img
            src={atxLogo}
            alt="ATX"
            className="w-9 h-9 rounded-lg object-cover"
          />
          {!collapsed && (
            <span className="font-heading font-bold text-primary text-xl tracking-wider">
              ANTURIX
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 pb-8 space-y-2 overflow-y-auto overflow-x-hidden min-h-0">
        {!collapsed && (
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 px-2">
            Navigation
          </p>
        )}

        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden ${collapsed ? "justify-center px-2" : ""} ${
                active
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-sidebar-border space-y-2 overflow-hidden">
          {!collapsed && (
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 px-2">
              Public Arena
            </p>
          )}
          <Link
            to="/arena"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden ${collapsed ? "justify-center px-2" : ""} ${
              location.pathname === "/arena"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-[10px] font-black uppercase tracking-widest">
                Explore Markets
              </span>
            )}
          </Link>
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden ${collapsed ? "justify-center px-2" : ""} ${
              location.pathname === "/"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
            }`}
          >
            <Swords className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-[10px] font-black uppercase tracking-widest">
                Private Duels
              </span>
            )}
          </Link>
        </div>

        <div className="pt-4 mt-4 border-t border-sidebar-border overflow-hidden">
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden ${collapsed ? "justify-center px-2" : ""} ${
              location.pathname === "/settings"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-[10px] font-black uppercase tracking-widest">
                Settings
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className="mt-auto pb-4 pt-4 px-4 border-t border-sidebar-border bg-muted/10">
        <div
          className={`flex items-center gap-2 text-muted-foreground ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] shrink-0 animate-slow-spin" />
          {!collapsed && (
            <span className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Powered by Solana
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
