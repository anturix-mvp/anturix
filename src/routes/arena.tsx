import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Plus, Globe, TrendingUp, Clock, BarChart3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MarketBuilderModal } from '@/components/arena/MarketBuilderModal';

export const Route = createFileRoute('/arena')({
  component: ArenaPage,
});

const MARKETS = [
  {
    id: 1,
    asset: 'SOL · Solana',
    question: "Will $SOL touch $160 before end of the week?",
    options: ['YES', 'NO'],
    split: [58, 42],
    volume: '$15,420',
    time: '12h 34m',
    category: 'CRYPTO',
    trending: true,
  },
  {
    id: 2,
    asset: 'BONK vs WIF',
    question: "Which token will have a higher 24h % gain: $BONK or $WIF?",
    options: ['BONK', 'WIF'],
    split: [71, 29],
    volume: '$8,900',
    time: '6h 12m',
    category: 'CRYPTO',
    trending: false,
  },
  {
    id: 3,
    asset: 'BTC · Bitcoin',
    question: "Will Bitcoin ($BTC) drop below $60,000 this Sunday?",
    options: ['YES', 'NO'],
    split: [33, 67],
    volume: '$42,100',
    time: '2d 4h',
    category: 'CRYPTO',
    trending: true,
  },
  {
    id: 4,
    asset: 'AAPL · Apple Inc.',
    question: "Will Apple ($AAPL) stock price surpass $180 this week?",
    options: ['YES', 'NO'],
    split: [44, 56],
    volume: '$11,200',
    time: '3d 8h',
    category: 'TRADFI',
    trending: true,
  },
  {
    id: 5,
    asset: 'NVDA · NVIDIA',
    question: "Will NVIDIA ($NVDA) close above $900 after earnings?",
    options: ['YES', 'NO'],
    split: [67, 33],
    volume: '$28,500',
    time: '1d 14h',
    category: 'TRADFI',
    trending: false,
  },
  {
    id: 6,
    asset: 'EUR/USD',
    question: "Will the Euro (EUR) drop below $1.05 USD at today's market close?",
    options: ['YES', 'NO'],
    split: [52, 48],
    volume: '$7,300',
    time: '4h 20m',
    category: 'TRADFI',
    trending: false,
  },
  {
    id: 7,
    asset: 'XAU · Gold',
    question: "Will Gold (XAU) close above $2,400/oz this Friday?",
    options: ['YES', 'NO'],
    split: [61, 39],
    volume: '$19,800',
    time: '1d 22h',
    category: 'COMMODITIES',
    trending: true,
  }
];

const TABS = [
  { id: 'trending', label: '🔥 Trending' },
  { id: 'crypto', label: '🪙 Crypto' },
  { id: 'tradfi', label: '📈 TradFi & Stocks' },
  { id: 'commodities', label: '🏅 Commodities' },
];

function ArenaPage() {
  const [activeTab, setActiveTab] = useState('trending');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const { authenticated } = useAuth();

  const filteredMarkets = MARKETS.filter(m => {
    if (activeTab === 'trending') return m.trending;
    return m.category.toLowerCase() === activeTab;
  });

  const handleTakePosition = () => {
    if (!authenticated) {
      toast.error("Connect wallet to take a position on this market");
    } else {
      toast("Public market positions coming in Phase 2 — private duels are live now! ⚔️", {
        icon: <AlertCircle className="w-4 h-4 text-primary" />,
      });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Public Arena</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tighter italic leading-none">
              🌍 EXPLORE MARKETS
            </h1>
            <p className="text-muted-foreground text-[10px] sm:text-sm font-bold uppercase tracking-widest opacity-60 leading-relaxed">
              100% permissionless · User-generated predictions · Powered by Solana
            </p>
          </div>
          
          <Button 
            variant="cyan"
            size="lg"
            className="h-14 md:h-16 px-8 font-black uppercase tracking-widest bg-primary text-black hover:bg-primary/90 glow-cyan cyber-corners group w-full md:w-auto"
            onClick={() => setIsBuilderOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
            CREATE MARKET
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-border/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                activeTab === tab.id
                  ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                  : "bg-muted/10 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <div 
              key={market.id}
              className="group relative flex flex-col bg-card/40 backdrop-blur-sm border border-border/50 rounded-3xl p-6 hover:border-primary/40 transition-all hover:shadow-[0_0_40px_rgba(0,255,255,0.05)]"
            >
              {/* Badges */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{market.category}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-success/10 border border-success/20 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[8px] font-black text-success uppercase tracking-widest">LIVE</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-bold font-mono">{market.time}</span>
                </div>
              </div>

              {/* Asset Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/30 flex items-center justify-center text-xl">
                  {market.category === 'CRYPTO' ? '🪙' : market.category === 'TRADFI' ? '📈' : '🏅'}
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{market.asset}</p>
                  <h3 className="text-base font-black leading-tight italic tracking-tight">{market.question}</h3>
                </div>
              </div>

              {/* Volume & Stats */}
              <div className="mt-auto pt-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className={cn(market.split[0] > market.split[1] ? "text-primary" : "text-muted-foreground")}>
                      {market.options[0]} ({market.split[0]}%)
                    </span>
                    <span className={cn(market.split[1] > market.split[0] ? "text-primary" : "text-muted-foreground")}>
                      ({market.split[1]}%) {market.options[1]}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden flex gap-0.5">
                    <div 
                      className="h-full bg-primary/80 transition-all duration-1000 shadow-[0_0_10px_rgba(0,255,255,0.2)]" 
                      style={{ width: `${market.split[0]}%` }} 
                    />
                    <div 
                      className="h-full bg-muted/50 transition-all duration-1000" 
                      style={{ width: `${market.split[1]}%` }} 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/20 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total Volume</span>
                    <span className="text-sm font-black text-foreground">{market.volume}</span>
                  </div>
                  <Button 
                    variant="cyan"
                    className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary text-[10px] font-black uppercase tracking-[0.15em] px-5 rounded-xl h-10 transition-all hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]"
                    onClick={handleTakePosition}
                  >
                    TAKE POSITION
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MarketBuilderModal open={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} />
    </MainLayout>
  );
}
