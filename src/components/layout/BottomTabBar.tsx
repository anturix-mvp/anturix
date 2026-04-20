import { Link, useLocation } from '@tanstack/react-router';
import { Home, User, Plus, Bell, Store, Swords, Lock } from 'lucide-react';
import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CreateBetModal } from '@/components/bet/CreateBetModal';
import { useWalletContext } from '@/contexts/WalletContext';


const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/', icon: Plus, label: 'Create', fab: true },
  { to: '/', icon: Bell, label: 'Alerts' },
  { to: '/marketplace', icon: Store, label: 'Market' },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { setShowCreateBetModal } = useWalletContext();


  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around px-2">
        {tabs.map((tab, idx) => {
          const active = location.pathname === tab.to;
          if ('fab' in tab && tab.fab) {
            return (
              <button
                key={`fab-${idx}`}
                onClick={() => setSheetOpen(true)}
                className="relative w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg fab-glow"
              >
                <Plus className="w-7 h-7 text-primary-foreground" />
              </button>
            );
          }
          return (
            <Link key={`tab-${idx}`} to={tab.to} className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>

              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="bg-card border-border">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-sm tracking-wider text-foreground">CREATE NEW</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            <button
              onClick={() => { setSheetOpen(false); setShowCreateBetModal(true); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-cyan">
                <Swords className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm font-bold text-foreground">Create Duel</p>
                <p className="text-xs text-muted-foreground">Challenge, prediction or arena pool</p>
              </div>
            </button>
            <button
              onClick={() => setSheetOpen(false)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center glow-magenta">
                <Lock className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm font-bold text-foreground">Sell Alpha</p>
                <p className="text-xs text-muted-foreground">Monetize your expert predictions</p>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

