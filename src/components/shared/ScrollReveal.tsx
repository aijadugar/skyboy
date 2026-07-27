import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

export interface ScrollRevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

// This is a React island because it wraps children in the shared Framer Motion scroll-reveal behavior.
export default function ScrollReveal({ children, delay = 0, className = "", ...props }: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
