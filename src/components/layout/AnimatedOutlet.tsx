import { useLocation, useMatches, Outlet } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

export function AnimatedOutlet() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="route-fade"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
