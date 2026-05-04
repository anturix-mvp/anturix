import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Calendar as CalendarIcon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MarketBuilderModalProps {
  open: boolean;
  onClose: () => void;
}

const ASSETS = [
  { id: 'SOL', name: 'Solana', category: 'CRYPTO', icon: '🪙' },
  { id: 'BTC', name: 'Bitcoin', category: 'CRYPTO', icon: '🪙' },
  { id: 'ETH', name: 'Ethereum', category: 'CRYPTO', icon: '🪙' },
  { id: 'BONK', name: 'Bonk', category: 'CRYPTO', icon: '🪙' },
  { id: 'WIF', name: 'dogwifhat', category: 'CRYPTO', icon: '🪙' },
  { id: 'JUP', name: 'Jupiter', category: 'CRYPTO', icon: '🪙' },
  { id: 'PYTH', name: 'Pyth Network', category: 'CRYPTO', icon: '🪙' },
  { id: 'AAPL', name: 'Apple Inc.', category: 'TRADFI', icon: '📈' },
  { id: 'NVDA', name: 'NVIDIA', category: 'TRADFI', icon: '📈' },
  { id: 'TSLA', name: 'Tesla, Inc.', category: 'TRADFI', icon: '📈' },
  { id: 'SPY', name: 'S&P 500 ETF', category: 'TRADFI', icon: '📈' },
  { id: 'EUR/USD', name: 'Euro / US Dollar', category: 'TRADFI', icon: '📈' },
  { id: 'GBP/USD', name: 'British Pound / US Dollar', category: 'TRADFI', icon: '📈' },
  { id: 'XAU', name: 'Gold', category: 'COMMODITIES', icon: '🏅' },
  { id: 'XAG', name: 'Silver', category: 'COMMODITIES', icon: '🏅' },
  { id: 'OIL', name: 'Crude Oil', category: 'COMMODITIES', icon: '🏅' },
];

export function MarketBuilderModal({ open, onClose }: MarketBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<typeof ASSETS[0] | null>(null);
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW' | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [expiry, setExpiry] = useState('');

  const filteredAssets = ASSETS.filter(a => 
    a.id.toLowerCase().includes(search.toLowerCase()) || 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    toast.success("Market created! Going live after oracle verification 🚀");
    onClose();
    // Reset state for next time
    setStep(1);
    setSelectedAsset(null);
    setCondition(null);
    setTargetPrice('');
    setExpiry('');
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return "Step 1 of 3 · Select Asset";
      case 2: return "Step 2 of 3 · Set Condition";
      case 3: return "Step 3 of 3 · Target & Expiry";
      default: return "";
    }
  };

  return (
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4", !open && "hidden")}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Progress Bar */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            {['Asset', 'Condition', 'Target & Time'].map((label, i) => (
              <span key={label} className={cn("text-[8px] font-black uppercase tracking-widest", step > i ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-all duration-300", step >= s ? "bg-primary shadow-[0_0_10px_rgba(0,255,255,0.4)]" : "bg-muted")} />
            ))}
          </div>
        </div>

        <div className="px-8 pb-4 border-b border-border/30">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">{getStepTitle()}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search assets (SOL, AAPL, Gold...)"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/30 border border-border/30 text-base sm:text-sm focus:outline-none focus:border-primary/40 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={cn(
                      "flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all group",
                      selectedAsset?.id === asset.id 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,255,0.1)]" 
                        : "bg-muted/10 border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{asset.icon}</span>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase tracking-widest">{asset.id}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{asset.name}</p>
                      </div>
                    </div>
                    {selectedAsset?.id === asset.id && (
                      <div className="px-2 py-1 rounded bg-primary/20 border border-primary/30">
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">SELECTED</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedAsset && (
                <div className="p-3 sm:p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">
                    Category auto-detected: {selectedAsset.category === 'CRYPTO' ? '🪙' : selectedAsset.category === 'TRADFI' ? '📈' : '🏅'} {selectedAsset.category}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setCondition('ABOVE')}
                  className={cn(
                    "flex sm:flex-col items-center gap-4 p-5 sm:p-8 rounded-3xl border transition-all text-left sm:text-center",
                    condition === 'ABOVE'
                      ? "bg-primary/10 border-primary shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                      : "bg-muted/10 border-border/30 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                  )}
                >
                  <div className={cn("p-3 sm:p-4 rounded-2xl bg-success/20 text-success border border-success/30 shrink-0", condition === 'ABOVE' && "bg-primary/20 text-primary border-primary/30")}>
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest">ABOVE</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Price goes higher than target</p>
                  </div>
                </button>

                <button
                  onClick={() => setCondition('BELOW')}
                  className={cn(
                    "flex sm:flex-col items-center gap-4 p-5 sm:p-8 rounded-3xl border transition-all text-left sm:text-center",
                    condition === 'BELOW'
                      ? "bg-primary/10 border-primary shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                      : "bg-muted/10 border-border/30 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                  )}
                >
                  <div className={cn("p-3 sm:p-4 rounded-2xl bg-destructive/20 text-destructive border border-destructive/30 shrink-0", condition === 'BELOW' && "bg-primary/20 text-primary border-primary/30")}>
                    <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest">BELOW</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Price goes lower than target</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Target Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">$</span>
                  <input
                    type="number"
                    placeholder="160.00"
                    className="w-full h-14 pl-8 pr-4 rounded-2xl bg-muted/30 border border-border/30 text-lg font-black focus:outline-none focus:border-primary/40 transition-all"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Expiry Date & Time</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-muted/30 border border-border/30 text-base sm:text-sm font-bold focus:outline-none focus:border-primary/40 transition-all color-scheme-dark"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Area */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 bg-muted/20 border-t border-border/30">
          <div className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all",
            step === 3 ? "bg-card border-primary/50 shadow-[0_0_30px_rgba(0,255,255,0.1)]" : "bg-muted/30 border-border/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                {step === 3 ? "📋 MARKET QUESTION PREVIEW" : "MARKET QUESTION PREVIEW"}
              </p>
              {selectedAsset && (
                <div className="px-2 py-0.5 rounded border border-border/50 bg-background/50">
                  <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">
                    Category: {selectedAsset.category}
                  </span>
                </div>
              )}
            </div>
            
            <p className={cn(
              "text-xs sm:text-sm font-bold italic transition-all leading-relaxed",
              selectedAsset ? "text-foreground" : "text-muted-foreground opacity-40"
            )}>
              "Will {selectedAsset?.id || '[Asset]'} go {condition || '[ABOVE/BELOW]'} {targetPrice ? '$' + targetPrice : '???'} on {expiry ? new Date(expiry).toLocaleString() : '???'}?"
            </p>

            {step === 3 && (
              <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Oracle: Pyth · {selectedAsset?.id}/USD feed
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 flex items-center gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest border-border/50"
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              BACK
            </Button>
          )}
          <Button
            className={cn(
              "flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all",
              step === 3 ? "bg-primary text-black hover:bg-primary/90 glow-cyan" : "bg-foreground text-background hover:opacity-90"
            )}
            onClick={() => {
              if (step < 3) setStep(s => s + 1);
              else handleCreate();
            }}
            disabled={
              (step === 1 && !selectedAsset) ||
              (step === 2 && !condition) ||
              (step === 3 && (!targetPrice || !expiry))
            }
          >
            {step === 3 ? "CREATE MARKET 🚀" : "NEXT →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
