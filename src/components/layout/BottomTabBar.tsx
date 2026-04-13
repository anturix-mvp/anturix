import { Link, useLocation } from '@tanstack/react-router';
import { Home, User, Plus, Bell, Store } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/', icon: Plus, label: 'Create', fab: true },
  { to: '/', icon: Bell, label: 'Alerts' },
  { to: '/marketplace', icon: Store, label: 'Market' },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around px-2">
      {tabs.map((tab) => {
        const active = location.pathname === tab.to;
        if ('fab' in tab && tab.fab) {
          return (
            <button key={tab.label} className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-lg glow-cyan">
              <Plus className="w-6 h-6 text-primary-foreground" />
            </button>
          );
        }
        return (
          <Link key={tab.label} to={tab.to} className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
