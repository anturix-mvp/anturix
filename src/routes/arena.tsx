import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Plus, Swords, Globe, Flame, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { CreateBetModal } from '@/components/bet/CreateBetModal';


export const Route = createFileRoute('/arena')({
  head: () => ({
    meta: [
      { title: 'Public Arena — Anturix' },
      { name: 'description', content: 'Live prediction markets, open to all on Solana.' },
    ],
  }),
  component: PublicArenaPage,
});

function PublicArenaPage() {
  const { setShowCreateBetModal } = useWalletContext();

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#050b0d] border border-primary/10 p-8 sm:p-12">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Global Pool</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-4xl sm:text-6xl">🌎</span>
                  <h1 className="text-5xl sm:text-7xl font-black font-heading italic tracking-tighter text-white uppercase italic">
                    PUBLIC <span className="text-primary drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]">ARENA</span>
                  </h1>
                </div>
                <p className="text-muted-foreground font-medium tracking-wide uppercase text-xs sm:text-sm pl-2">
                  Live prediction markets, open to all
                </p>
              </div>

              <Button 
                onClick={() => setShowCreateBetModal(true)}
                className="bg-primary text-black font-black uppercase tracking-widest px-8 py-7 rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,255,0.3)] group"
              >
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                Create Public Duel
              </Button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="relative min-h-[400px] rounded-[2.5rem] border border-border/50 bg-muted/5 flex flex-col items-center justify-center p-12 text-center space-y-8 overflow-hidden">
          {/* Decorative mesh background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 mx-auto">
              <Swords className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tighter text-white uppercase italic">
              No Public Duels Yet
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto mt-4 text-sm font-medium leading-relaxed">
              Be the first degen to seed a public prediction market and let the global community back their words with SOL.
            </p>
          </div>

          <Button 
            onClick={() => setShowCreateBetModal(true)}
            size="lg"
            className="h-16 px-12 rounded-2xl bg-primary text-black font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(0,255,255,0.3)] hover:scale-105 transition-all"
          >
            Seed First Pool 🔥
          </Button>

          {/* Skeleton cards in background */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl opacity-20 pointer-events-none mt-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-3xl border border-border bg-muted/50" />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}


const Zap = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);
