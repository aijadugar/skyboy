import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CLI_NAME } from "@/lib/constants";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-[var(--skyboy-background)] py-24 md:py-28">
      <motion.div
        className="skyboy-container relative z-10 grid gap-14"
        variants={reduceMotion ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Text block */}
        <div className="grid gap-14 md:grid-cols-2 md:items-center">
          {/* Left column: headline + CTAs */}
          <div className="flex max-w-2xl flex-col gap-7">
            <motion.div
              variants={itemVariants}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--skyboy-border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--skyboy-text-secondary)]"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--status-clean)] opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--status-clean)]" />
              </span>
              <span>Now supporting retrieval &amp; ranking benchmarks</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="max-w-xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--skyboy-text)] md:text-7xl"
            >
              Benchmark AI algorithms.{" "}
              <span className="marker-underline">Catch regressions.</span>{" "}
              Ship with confidence.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="max-w-xl text-base leading-[1.75] text-[var(--skyboy-text-secondary)] md:text-lg"
            >
              Push your algorithm &rarr; Skyboy benchmarks it against standardized datasets &rarr; flags regressions automatically.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex w-full flex-col items-start justify-center gap-3 sm:w-auto sm:flex-row"
            >
              <a
                href="#early-access"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--skyboy-text)] px-6 text-sm font-medium text-[var(--skyboy-background)] transition hover:bg-[var(--skyboy-surface)] hover:text-[var(--skyboy-text)]"
              >
                Get early access
              </a>
              <a
                href="#leaderboard"
                className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-[var(--skyboy-blue)] transition hover:underline underline-offset-4"
              >
                View leaderboard
                <ArrowRight className="size-4" />
              </a>
            </motion.div>

            <motion.p variants={itemVariants} className="text-sm text-[var(--skyboy-text-muted)]">
              No credit card required &middot; Free for public projects
            </motion.p>
          </div>

          {/* Right column: terminal visual */}
          <motion.div
            variants={itemVariants}
            className="w-full"
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--skyboy-border)] bg-[var(--card)] shadow-none">
              {/* Terminal header */}
              <div className="flex items-center gap-2 border-b border-[var(--skyboy-border)] bg-[var(--skyboy-surface)] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-[#FF5F57]" />
                  <span className="size-3 rounded-full bg-[#FEBC2E]" />
                  <span className="size-3 rounded-full bg-[#28C840]" />
                </div>
                <span className="ml-2 font-mono text-xs text-[var(--skyboy-text-muted)]">sandbox — {CLI_NAME}</span>
              </div>

              {/* Terminal body */}
              <div className="font-mono text-sm">
                {/* Command input */}
                <div className="border-b border-[var(--skyboy-border)] px-4 py-3">
                  <span className="text-[var(--status-clean)]">$</span>
                  <span className="ml-2 text-[var(--skyboy-text)]">sb push</span>
                </div>

                {/* Log output */}
                <div className="space-y-1 px-4 py-3 text-[var(--skyboy-text-secondary)]">
                  <p><span className="text-[var(--skyboy-text-muted)]">[1/4]</span> Packing benchmark suite...</p>
                  <p><span className="text-[var(--skyboy-text-muted)]">[2/4]</span> Uploading to sandbox...</p>
                  <p><span className="text-[var(--skyboy-text-muted)]">[3/4]</span> Running retrieval tests...</p>
                  <p><span className="text-[var(--skyboy-text-muted)]">[4/4]</span> Computing ranking metrics...</p>
                </div>

                {/* Result block */}
                <div className="border-t border-[var(--skyboy-border)] bg-[var(--skyboy-surface)] px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full border border-[var(--status-clean)]/20 bg-[var(--status-clean)]/8 px-2.5 py-0.5 text-xs font-medium text-[var(--status-clean)]">
                      clean
                    </span>
                    <span className="font-mono text-xs text-[var(--skyboy-text-muted)]">hybrid-retriever v0.3.2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-[var(--skyboy-text-muted)]">Recall@10</p>
                      <p className="font-mono text-lg font-medium text-[var(--status-clean)]">0.847</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--skyboy-text-muted)]">NDCG@10</p>
                      <p className="font-mono text-lg font-medium text-[var(--status-clean)]">0.791</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--skyboy-text-muted)]">Latency</p>
                      <p className="font-mono text-lg font-medium text-[var(--skyboy-text)]">42ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--skyboy-text-muted)]">Regressions</p>
                      <p className="font-mono text-lg font-medium text-[var(--status-clean)]">0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
