import { Bell, Plus, Search } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WalletDropdown } from '@/components/wallet/WalletDropdown';
import { useAuth } from '@/hooks/useAuth';
import { CreateBetModal } from '@/components/bet/CreateBetModal';
import { XPProgressBar, StreakBadge } from '@/components/gamification/RankSystem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { currentUser } from '@/data/mockData';
import atxLogo from '@/assets/atx-logo.jpg';

export function Navbar() {
  const { authenticated } = useAuth();
  const [betModalOpen, setBetModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl px-4">
        <div className="h-14 flex items-center gap-3">
          {/* Logo (mobile) */}
          <Link to="/" className="flex items-center gap-2">
            <img src={atxLogo} alt="ATX" className="w-12 h-12 rounded-lg object-cover" />
            <span className="font-heading font-bold text-sm tracking-wider" style={{ color: '#e0fcff', textShadow: '0 0 8px rgba(0, 255, 255, 0.6), 0 0 20px rgba(0, 255, 255, 0.3)' }}>ANTURIX</span>
          </Link>


          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <StreakBadge streak={currentUser.streak} />

            <Button variant="cyan" size="sm" className="hidden sm:flex gap-1.5" onClick={() => setBetModalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Create Duel</span>
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
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${authenticated ? 'bg-success' : 'bg-destructive'}`} />
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
