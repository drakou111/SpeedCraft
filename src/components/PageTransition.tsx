import { motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

export const defaultTransition: Transition = {
  type: "tween",
  duration: 0.25,
  ease: "easeInOut",
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={defaultTransition}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
