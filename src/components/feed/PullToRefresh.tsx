import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh?: () => void }) {
  const y = useMotionValue(0);
  const spinAngle = useTransform(y, [0, 100], [0, 360]);
  const indicatorOpacity = useTransform(y, [0, 40], [0, 1]);
  const [refreshing, setRefreshing] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) {
      setRefreshing(true);
      onRefresh?.();
      setTimeout(() => setRefreshing(false), 1500);
    }
  };

  return (
    <div className="relative lg:contents">
      <motion.div
        style={{ opacity: refreshing ? 1 : indicatorOpacity }}
        className="flex items-center justify-center py-3 lg:hidden"
      >
        <motion.div style={{ rotate: refreshing ? undefined : spinAngle }} className={refreshing ? 'animate-spin' : ''}>
          <RefreshCw className="w-5 h-5 text-primary" />
        </motion.div>
      </motion.div>
      <motion.div
        style={refreshing ? undefined : { y }}
        drag={refreshing ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        className="lg:!transform-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
