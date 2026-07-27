import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import AnimatedGridBackground from "@/components/shared/AnimatedGridBackground";
import TerminalWindow, { type TerminalLine } from "@/components/shared/TerminalWindow";
import { Button } from "@/components/ui/button";

const terminalLines: TerminalLine[] = [
  "$ skyboy push",
  "→ Detected algorithm: hybrid-retriever v0.3.2",
  "→ Running BEIR benchmark suite...",
  { text: "→ Recall@10: 0.847 (+2.1% vs previous)", tone: "success" },
  { text: "→ NDCG@10: 0.791 (+1.4% vs previous)", tone: "success" },
  { text: "→ No regressions detected", tone: "success" },
  { text: "→ View results: skyboy.in/run/8f21ab", tone: "muted" },
];

const metrics = [
  { label: "Recall@10", value: "0.847", tone: "text-skyboy-success" },
  { label: "Latency", value: "42ms", tone: "text-skyboy-text" },
  { label: "Regressions", value: "0", tone: "text-skyboy-success" },
] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
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
    <section className="relative isolate flex min-h-[90vh] items-center overflow-hidden py-24 md:py-28">
      <AnimatedGridBackground blobOpacity={0.16} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-skyboy-background to-transparent" />

      <motion.div
        className="skyboy-container relative z-10 grid gap-12"
        variants={reduceMotion ? undefined : containerVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <div className="mx-auto grid max-w-4xl justify-items-center gap-7 text-center">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-skyboy-text-secondary backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-skyboy-success opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-skyboy-success" />
            </span>
            <span>Now supporting retrieval & ranking benchmarks</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="max-w-4xl text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-skyboy-text md:text-7xl"
          >
            The GitHub for <span className="text-gradient-accent">AI Algorithms</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-2xl text-base leading-[1.7] text-skyboy-text-secondary md:text-lg"
          >
            Upload an algorithm. Skyboy benchmarks it, compares it against baselines, tracks every experiment, and
            catches regressions automatically — so you stop rebuilding evaluation infrastructure for every new ranking,
            retrieval, or reasoning system you ship.
          </motion.p>

          <motion.div variants={itemVariants} className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-gradient-accent text-skyboy-text shadow-[0_0_30px_rgba(59,130,246,0.22)] transition hover:scale-[1.01] hover:shadow-[0_0_42px_rgba(34,211,238,0.26)]"
            >
              <a href="#pricing">Get Started — Free</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="border border-white/[0.08] bg-white/[0.03] text-skyboy-text hover:border-white/[0.16] hover:bg-white/[0.06]"
            >
              <a href="#leaderboards">
                View Live Leaderboards
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </motion.div>

          <motion.p variants={itemVariants} className="text-sm text-skyboy-text-muted">
            No credit card required · Free for public projects
          </motion.p>
        </div>

        <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <motion.div variants={itemVariants}>
            <TerminalWindow title="skyboy push" lines={terminalLines} className="min-h-[308px]" />
          </motion.div>

          <motion.div
            variants={itemVariants}
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_24px_80px_rgba(59,130,246,0.16)] backdrop-blur transition hover:border-white/[0.16]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle at 60% 0%, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.12) 40%, transparent 72%)",
              }}
            />
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-skyboy-text">Benchmark run</p>
                <p className="mt-1 text-xs text-skyboy-text-muted">hybrid-retriever v0.3.2 · BEIR</p>
              </div>
              <div className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-skyboy-success">clean</div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-skyboy-background/60 p-4">
              <svg viewBox="0 0 420 170" className="h-40 w-full" role="img" aria-label="Benchmark trend chart">
                <defs>
                  <linearGradient id="hero-chart-line" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="55%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                  <linearGradient id="hero-chart-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[38, 76, 114, 152].map((y) => (
                  <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
                ))}
                <path
                  d="M 0 132 C 42 124, 58 104, 94 108 C 138 114, 148 76, 188 82 C 226 88, 242 62, 282 64 C 326 66, 342 35, 420 28 L 420 170 L 0 170 Z"
                  fill="url(#hero-chart-fill)"
                />
                <motion.path
                  d="M 0 132 C 42 124, 58 104, 94 108 C 138 114, 148 76, 188 82 C 226 88, 242 62, 282 64 C 326 66, 342 35, 420 28"
                  fill="none"
                  stroke="url(#hero-chart-line)"
                  strokeLinecap="round"
                  strokeWidth="4"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-xs text-skyboy-text-muted">{metric.label}</p>
                  <p className={`mt-1 font-mono text-lg ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
