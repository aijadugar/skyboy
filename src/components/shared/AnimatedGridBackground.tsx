import { motion, useReducedMotion, type Transition } from "framer-motion";

export interface AnimatedGridBackgroundProps {
  className?: string;
  blobOpacity?: number;
}

// This is a React island because the accent blobs use Framer Motion for a slow ambient loop.
export default function AnimatedGridBackground({
  className = "",
  blobOpacity = 0.18,
}: AnimatedGridBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const blobTransition: Transition = { duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" };

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 78%)",
        }}
      />
      <motion.div
        className="absolute left-[8%] top-[8%] h-72 w-72 rounded-full bg-gradient-accent blur-3xl"
        style={{ opacity: blobOpacity }}
        animate={reduceMotion ? undefined : { x: [0, 42, -18, 0], y: [0, -24, 36, 0] }}
        transition={blobTransition}
      />
      <motion.div
        className="absolute bottom-[4%] right-[10%] h-80 w-80 rounded-full bg-gradient-accent blur-3xl"
        style={{ opacity: blobOpacity * 0.75 }}
        animate={reduceMotion ? undefined : { x: [0, -36, 24, 0], y: [0, 32, -20, 0] }}
        transition={{ ...blobTransition, duration: 24 }}
      />
    </div>
  );
}
