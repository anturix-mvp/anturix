import { Bell, Plus, Search } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WalletDropdown } from '@/components/wallet/WalletDropdown';
import { useWalletContext } from '@/contexts/WalletContext';
import { CreateBetModal } from '@/components/bet/CreateBetModal';
import { XPProgressBar, StreakBadge } from '@/components/gamification/RankSystem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { currentUser } from '@/data/mockData';
import atxLogo from '@/assets/atx-logo.jpg';
import { Globe, Swords, Lock, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'crypto',
    number: '1.',
    label: 'Crypto Duels',
    subtitle: 'PHASE 1 - ACTIVE',
    status: 'active',
    items: [
      { to: '/arena', label: 'PUBLIC ARENA', icon: Globe },
      { to: '/', label: 'PRIVATE DUELS', icon: Swords },
    ]
  },
  {
    id: 'casino',
    number: '2.',
    label: 'Social Casino',
    subtitle: 'PHASE 2',
    status: 'soon'
  },
  {
    id: 'sports',
    number: '3.',
    label: 'Sportsbook',
    subtitle: 'PHASE 3',
    status: 'soon'
  },
  {
    id: 'oracle',
    number: '4.',
    label: 'Oracle Hub',
    subtitle: 'PHASE 4',
    status: 'soon'
  }
];


export function Navbar() {
  const { connected } = useWalletContext();
  const [betModalOpen, setBetModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl px-4">
        <div className="h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 group mr-4 shrink-0">
            <span className="font-heading font-black text-xl tracking-[0.3em] italic text-primary group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all">ANTURIX</span>
          </Link>


          {/* Horizontal Roadmap Navigation */}
          <nav className="hidden lg:flex items-center gap-1 mx-4 h-full">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="relative group h-full flex items-center px-3">
                <div className={`flex items-center gap-2 cursor-pointer transition-all ${cat.status === 'soon' ? 'opacity-40 grayscale pointer-events-none' : 'hover:text-primary'}`}>
                  <span className="text-[10px] font-black text-muted-foreground">{cat.number}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{cat.label}</span>
                  {cat.items && <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:rotate-180" />}
                  {cat.status === 'soon' && (
                    <span className="text-[6px] font-black px-1 py-0.5 rounded bg-muted border border-border text-muted-foreground">SOON</span>
                  )}
                </div>

                {/* Dropdown for Active Items */}
                {cat.items && (
                  <div className="absolute top-[100%] left-0 w-48 mt-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-[100]">
                    <div className="bg-[#0a0f11] border border-border/50 rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                      <div className="p-2 mb-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{cat.subtitle}</p>
                      </div>
                      {cat.items.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all group/item"
                        >
                          <item.icon className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Active Underline */}
                {cat.status === 'active' && (
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
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">3</span>
            </button>

            <StreakBadge streak={currentUser.streak} />

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
                        className={`w-8 h-8 rounded-full border-2 ${currentUser.rank === 'Legend' ? 'rank-legend-avatar border-transparent' : 'border-primary'}`}
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${connected ? 'bg-success' : 'bg-destructive'}`} />
                    </div>
                    <div className="w-10 mt-0.5">
                      <XPProgressBar rank={currentUser.rank} size="sm" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border text-foreground">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">{currentUser.username}</p>
                    <p className="text-[10px] text-muted-foreground">Rank: {currentUser.rank} · {currentUser.reputationScore.toLocaleString()} XP</p>
                    <XPProgressBar rank={currentUser.rank} size="md" />
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <CreateBetModal open={betModalOpen} onClose={() => setBetModalOpen(false)} />
    </>
  );
}
