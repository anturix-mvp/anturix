import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Eye, Users, Clock, Coins, ChevronDown, Zap } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

const betTypes = [
  { value: 'duel', label: '1v1 Duelo', icon: Swords, description: 'Challenge someone directly' },
  { value: 'prediction', label: 'Expert Lock', icon: Eye, description: 'Sell your prediction' },
  { value: 'pool', label: 'Poker Pool', icon: Users, description: 'Group stakes pool' },
] as const;

const durations = [
  { value: '1h', label: '1 Hora' },
  { value: '6h', label: '6 Horas' },
  { value: '24h', label: '24 Horas' },
  { value: '3d', label: '3 Días' },
  { value: '7d', label: '7 Días' },
];

const presetAmounts = [0.1, 0.5, 1, 5, 10];

interface CreateBetModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBetModal({ open, onClose }: CreateBetModalProps) {
  const { connected, requireWallet } = useWallet();
  const [betType, setBetType] = useState<string>('duel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('24h');
  const [step, setStep] = useState(1);

  const resetForm = () => {
    setBetType('duel');
    setTitle('');
    setDescription('');
    setAmount('');
    setDuration('24h');
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!connected) {
      requireWallet();
      return;
    }
    // Mock submission
    handleClose();
  };

  const isValid = title.trim().length > 0 && description.trim().length > 0 && parseFloat(amount) > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl z-10"
          >
            {/* Handle bar (mobile) */}
            <div className="sm:hidden flex justify-center pt-3">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-sm font-bold tracking-wider text-foreground">CREAR APUESTA</h2>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 px-4 pt-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex-1 flex items-center gap-2">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
                </div>
              ))}
            </div>

            {/* Step 1: Type & Details */}
            {step === 1 && (
              <div className="p-4 space-y-5">
                {/* Bet type selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">TIPO DE APUESTA</label>
                  <div className="grid grid-cols-3 gap-2">
                    {betTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setBetType(type.value)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          betType === type.value
                            ? 'border-primary bg-primary/10 shadow-[0_0_15px_oklch(0.82_0.18_195/0.2)]'
                            : 'border-border bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <type.icon className={`w-5 h-5 mx-auto mb-1.5 ${betType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`text-[11px] font-heading font-bold ${betType === type.value ? 'text-primary' : 'text-foreground'}`}>{type.label}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 hidden sm:block">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">EVENTO / TÍTULO</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Lakers vs Celtics - NBA Finals Game 7"
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block text-right">{title.length}/100</span>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">DESCRIPCIÓN</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Describe your prediction or bet terms..."
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all resize-none"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block text-right">{description.length}/500</span>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!title.trim() || !description.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-heading text-sm font-bold tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-opacity glow-cyan"
                >
                  SIGUIENTE →
                </button>
              </div>
            )}

            {/* Step 2: Amount & Duration */}
            {step === 2 && (
              <div className="p-4 space-y-5">
                {/* Amount */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" /> MONTO (SOL)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-lg font-heading font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_10px_oklch(0.82_0.18_195/0.2)] transition-all"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    {presetAmounts.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmount(preset.toString())}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          amount === preset.toString()
                            ? 'bg-primary/20 text-primary border border-primary/50'
                            : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                        }`}
                      >
                        {preset} SOL
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> DURACIÓN
                  </label>
                  <div className="flex items-center gap-2">
                    {durations.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDuration(d.value)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${
                          duration === d.value
                            ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_oklch(0.82_0.18_195/0.15)]'
                            : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="glass-card p-4 space-y-2 cyber-corners">
                  <div className="cyber-corners-bottom">
                    <p className="text-[10px] font-heading text-muted-foreground tracking-wider mb-2">RESUMEN</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="text-foreground font-medium">{betTypes.find(t => t.value === betType)?.label}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Evento</span>
                      <span className="text-foreground font-medium truncate ml-4">{title || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Monto</span>
                      <span className="text-success font-heading font-bold">{amount || '0'} SOL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Duración</span>
                      <span className="text-foreground font-medium">{durations.find(d => d.value === duration)?.label}</span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-heading text-sm font-bold tracking-wider hover:bg-muted/50 transition-colors"
                  >
                    ← ATRÁS
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-heading text-sm font-bold tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-opacity glow-cyan"
                  >
                    CREAR 🔥
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
