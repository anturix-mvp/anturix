import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Bookmark, X } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onDismiss?: () => void;
  onBookmark?: () => void;
}

export function SwipeableCard({ children, onDismiss, onBookmark }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const dismissOpacity = useTransform(x, [-150, -50], [1, 0]);
  const bookmarkOpacity = useTransform(x, [50, 150], [0, 1]);
  const [gone, setGone] = useState(false);

  if (gone) return null;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -120) {
      setGone(true);
      onDismiss?.();
    } else if (info.offset.x > 120) {
      onBookmark?.();
    }
  };

  return (
    <div className="relative lg:contents">
      {/* Swipe indicators – mobile only */}
      <div className="lg:hidden">
        <motion.div
          style={{ opacity: dismissOpacity }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-destructive" />
        </motion.div>
        <motion.div
          style={{ opacity: bookmarkOpacity }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center"
        >
          <Bookmark className="w-5 h-5 text-gold" />
        </motion.div>
      </div>
      <motion.div
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        className="relative z-10 lg:!transform-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
