import { Link, useLocation } from '@tanstack/react-router';
import { Home, Rss, Search, Users, Trophy, Calendar, Settings } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/', icon: Rss, label: 'Feed' },
  { to: '/', icon: Search, label: 'Search' },
  { to: '/', icon: Users, label: 'Friends' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/', icon: Calendar, label: 'Calendar' },
  { to: '/', icon: Settings, label: 'Settings' },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
    >
      <div className="p-4 flex items-center gap-2">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-heading text-primary font-bold text-sm glow-cyan">A</div>
          {!collapsed && <span className="font-heading font-bold text-primary text-lg tracking-wider">ANTURIX</span>}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                active ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${active ? 'drop-shadow-[0_0_6px_var(--color-primary)]' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className={`flex items-center gap-2 text-muted-foreground ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Powered by Solana</span>}
        </div>
      </div>
    </aside>
  );
}
