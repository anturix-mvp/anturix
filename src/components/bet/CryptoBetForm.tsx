import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Target, Flame, Flag, Dices, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';

type CryptoAsset = 'SOL' | 'BTC' | 'ETH';
type Condition = 'above' | 'below' | 'even' | 'odd' | 'first_to' | 'one_touch';
type TimeOption = '1h' | '24h' | '1w';

const ASSETS: { value: CryptoAsset; label: string; icon: string; price: number }[] = [
  { value: 'SOL', label: 'SOL', icon: '◎', price: 148.32 },
  { value: 'BTC', label: 'BTC', icon: '₿', price: 67420.50 },
  { value: 'ETH', label: 'ETH', icon: 'Ξ', price: 3285.10 },
];

const CONDITIONS: {
  value: Condition;
  label: string;
  emoji: string;
  description: string;
  bgClass: string;
  borderClass: string;
}[] = [
  {
    value: 'above',
    label: 'Arriba de',
    emoji: '🔼',
    description: 'El precio superará el objetivo',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/40',
  },
  {
    value: 'below',
    label: 'Debajo de',
    emoji: '🔽',
    description: 'El precio caerá del objetivo',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/40',
  },
  {
    value: 'even',
    label: 'Cerrará en PAR',
    emoji: '🎲',
    description: 'Último dígito del precio será par',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/40',
  },
  {
    value: 'odd',
    label: 'Cerrará en IMPAR',
    emoji: '🎲',
    description: 'Último dígito del precio será impar',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/40',
  },
  {
    value: 'first_to',
    label: 'Llegará primero a…',
    emoji: '🏁',
    description: 'Carrera: ¿cuál llega primero?',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/40',
  },
  {
    value: 'one_touch',
    label: 'Tocará el precio',
    emoji: '💥',
    description: 'Solo necesita tocar una vez',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/40',
  },
];

const TIME_OPTIONS: { value: TimeOption; label: string }[] = [
  { value: '1h', label: '1 Hora' },
  { value: '24h', label: '24 Horas' },
  { value: '1w', label: '1 Semana' },
];

interface CryptoBetFormData {
  asset: CryptoAsset;
  condition: Condition;
  targetPrice: string;
  timeOption: TimeOption;
  // For first_to race
  assetB?: CryptoAsset;
  targetPriceB?: string;
  // For even/odd datetime
  specificDatetime?: string;
}

interface CryptoBetFormProps {
  onDataChange: (data: CryptoBetFormData) => void;
}

export function CryptoBetForm({ onDataChange }: CryptoBetFormProps) {
  const [asset, setAsset] = useState<CryptoAsset>('SOL');
  const [condition, setCondition] = useState<Condition | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [timeOption, setTimeOption] = useState<TimeOption>('24h');
  const [assetB, setAssetB] = useState<CryptoAsset>('BTC');
  const [targetPriceB, setTargetPriceB] = useState('');
  const [specificDatetime, setSpecificDatetime] = useState('');

  const currentAsset = ASSETS.find(a => a.value === asset)!;
  const currentAssetB = ASSETS.find(a => a.value === assetB)!;
  const isRace = condition === 'first_to';
  const isDigitBet = condition === 'even' || condition === 'odd';

  const emitData = () => {
    if (condition) {
      onDataChange({
        asset, condition, targetPrice, timeOption,
        ...(isRace ? { assetB, targetPriceB } : {}),
        ...(isDigitBet ? { specificDatetime } : {}),
      });
    }
  };

  // Emit on any change
  useMemo(emitData, [asset, condition, targetPrice, timeOption, assetB, targetPriceB, specificDatetime]);

  return (
    <div className="space-y-5">
      {/* Asset Selector */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block tracking-wider">
          {isRace ? 'ACTIVO A' : 'ACTIVO'}
        </label>
        <div className="flex gap-2">
          {ASSETS.map((a) => (
            <motion.button
              key={a.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAsset(a.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-heading font-bold transition-all ${
                asset === a.value
                  ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_oklch(0.82_0.18_195/0.25)]'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <span className="text-lg">{a.icon}</span>
              <span>{a.label}</span>
            </motion.button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Precio actual: <span className="text-foreground font-medium">${currentAsset.price.toLocaleString()}</span>
        </p>
      </div>

      {/* Condition Selector */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block tracking-wider">CONDICIÓN</label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <motion.button
              key={c.value}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setCondition(c.value)}
              className={`relative p-3 rounded-xl border text-left transition-all overflow-hidden ${
                condition === c.value
                  ? `${c.borderClass} ${c.bgClass} shadow-lg ring-1 ring-white/10`
                  : 'border-border bg-muted/20 hover:bg-muted/40'
              }`}
            >
              {/* Casino shimmer effect when selected */}
              {condition === c.value && (
                <motion.div
                  className="absolute inset-0 opacity-20"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  style={{
                    background: 'linear-gradient(90deg, transparent, white, transparent)',
                    width: '50%',
                  }}
                />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">{c.emoji}</span>
                  <span className={`text-xs font-heading font-bold ${
                    condition === c.value ? 'text-foreground' : 'text-foreground/80'
                  }`}>
                    {c.label}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight">{c.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Target Price / Race inputs */}
      <AnimatePresence mode="wait">
        {condition && !isDigitBet && (
          <motion.div
            key={isRace ? 'race' : 'single'}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {isRace ? (
              <>
                {/* Race: Asset A */}
                <div className="glass-card p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-heading text-muted-foreground tracking-wider">ACTIVO A — {asset}</span>
                  </div>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder={`$${currentAsset.price.toLocaleString()}`}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm font-heading font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all"
                  />
                </div>

                {/* Race: Asset B */}
                <div className="glass-card p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-heading text-muted-foreground tracking-wider">ACTIVO B</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    {ASSETS.filter(a => a.value !== asset).map((a) => (
                      <motion.button
                        key={a.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAssetB(a.value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-heading font-bold transition-all ${
                          assetB === a.value
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span>{a.icon}</span> {a.label}
                      </motion.button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={targetPriceB}
                    onChange={(e) => setTargetPriceB(e.target.value)}
                    placeholder={`$${currentAssetB.price.toLocaleString()}`}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm font-heading font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> PRECIO OBJETIVO
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={`$${currentAsset.price.toLocaleString()}`}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-lg font-heading font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Selector */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {isDigitBet ? 'FECHA Y HORA EXACTA' : 'DURACIÓN'}
        </label>
        {isDigitBet ? (
          <input
            type="datetime-local"
            value={specificDatetime}
            onChange={(e) => setSpecificDatetime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all [color-scheme:dark]"
          />
        ) : (
          <div className="flex gap-2">
            {TIME_OPTIONS.map((t) => (
              <motion.button
                key={t.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTimeOption(t.value)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${
                  timeOption === t.value
                    ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_oklch(0.82_0.18_195/0.15)]'
                    : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                }`}
              >
                {t.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
