import { useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface BanterMessage {
  id: string;
  user: string;
  avatar: string;
  text: string;
  side: 'challenger' | 'opponent' | 'spectator';
  timestamp: string;
}

const mockBanter: BanterMessage[] = [
  { id: 'b1', user: 'SolanaShark', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SolanaShark', text: 'No way challenger loses this 🔥', side: 'challenger', timestamp: '2m ago' },
  { id: 'b2', user: 'DegenKing_99', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DegenKing', text: 'Opponent underdog story incoming...', side: 'opponent', timestamp: '1m ago' },
  { id: 'b3', user: 'LuckyPunter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LuckyPunter', text: 'This is gonna be insane!! 🍿', side: 'spectator', timestamp: '30s ago' },
];

export function BanterChat() {
  const [messages, setMessages] = useState(mockBanter);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: BanterMessage = {
      id: `b${Date.now()}`,
      user: 'You',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoAlpha',
      text: input.trim(),
      side: 'spectator',
      timestamp: 'now',
    };
    setMessages((prev) => [...prev, msg]);
    setInput('');
  };

  const sideColor = (side: BanterMessage['side']) => {
    if (side === 'challenger') return 'border-l-2 border-l-primary';
    if (side === 'opponent') return 'border-l-2 border-l-accent';
    return 'border-l-2 border-l-muted';
  };

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-heading text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          LIVE BANTER · {messages.length} messages
        </span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-2 space-y-2 max-h-40 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2 py-1 pl-2 ${sideColor(msg.side)}`}>
                <img src={msg.avatar} alt={msg.user} className="w-5 h-5 rounded-full shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-foreground">{msg.user}</span>
                    <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-foreground/80 break-words">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-3 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              maxLength={200}
              placeholder="Drop your take..."
              className="flex-1 h-8 px-3 rounded-lg bg-muted/50 border border-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button onClick={handleSend} className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">
              <Send className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
