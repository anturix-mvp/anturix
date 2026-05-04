import { useLocation, useMatches, Outlet } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

export function AnimatedOutlet() {
  const location = useLocation();

  return (
    <AnimatePresence>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
        className="route-fade"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
