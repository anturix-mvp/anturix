import { toast } from 'sonner';
import type { Achievement } from '@/types/anturix';

export function showAchievementToast(achievement: Achievement) {
  toast.custom(
    (id) => (
      <div className="achievement-toast relative overflow-hidden rounded-xl border border-gold/50 bg-card p-4 shadow-[0_0_30px_oklch(0.82_0.16_85/0.3)]">
        {/* Confetti particles */}
        <div className="confetti-container">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`confetti-particle confetti-${i % 4}`} style={{ left: `${(i / 12) * 100}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="text-4xl animate-bounce">{achievement.icon}</div>
          <div>
            <p className="text-[10px] font-heading text-gold tracking-widest">🏆 ACHIEVEMENT UNLOCKED</p>
            <p className="font-heading text-sm font-bold text-foreground mt-0.5">{achievement.name}</p>
            <p className="text-[11px] text-muted-foreground">{achievement.description}</p>
          </div>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
