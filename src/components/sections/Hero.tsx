import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CLI_NAME } from "@/lib/constants";

const metrics = [
  { label: "Recall@10", value: "0.847", positive: true },
  { label: "NDCG@10", value: "0.791", positive: true },
  { label: "Latency", value: "42ms", positive: false },
  { label: "Regressions", value: "0", positive: true },
] as const;

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
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-[#FAFAF8] py-24 md:py-28">
      <motion.div
        className="skyboy-container relative z-10 grid gap-14"
        variants={reduceMotion ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Text block */}
        <div className="mx-auto grid max-w-3xl justify-items-center gap-7 text-center">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm text-[#4B4B48]"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#16A34A] opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-[#16A34A]" />
            </span>
            <span>Now supporting retrieval &amp; ranking benchmarks</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-[#111110] md:text-7xl"
          >
            Benchmark AI algorithms.{" "}
            <span className="marker-underline">Catch regressions.</span>{" "}
            Ship with confidence.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-xl text-base leading-[1.75] text-[#4B4B48] md:text-lg"
          >
            Push your algorithm &rarr; Skyboy benchmarks it against standardized datasets &rarr; flags regressions automatically.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
          >
            <a
              href="#early-access"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#111110] px-6 text-sm font-medium text-white transition hover:bg-[#2a2a28]"
            >
              Get early access
            </a>
            <a
              href="#leaderboard"
              className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-[#2563EB] transition hover:underline underline-offset-4"
            >
              View leaderboard
              <ArrowRight className="size-4" />
            </a>
          </motion.div>

          <motion.p variants={itemVariants} className="text-sm text-[#8A8A85]">
            No credit card required &middot; Free for public projects
          </motion.p>
        </div>

        {/* Benchmark card preview */}
        <div className="mx-auto w-full max-w-3xl">
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-[#FAFAF8]">
              {/* Card header */}
              <div className="flex flex-col gap-3 border-b border-black/[0.08] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#111110]">Benchmark run</p>
                  <p className="mt-1 font-mono text-xs text-[#8A8A85]">$ {CLI_NAME} push</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-black/[0.08] bg-[#F0F0ED] px-3 py-1 text-[#4B4B48]">
                    hybrid-retriever v0.3.2
                  </span>
                  <span className="rounded-full border border-[#16A34A]/20 bg-[#16A34A]/8 px-3 py-1 text-[#16A34A]">
                    clean
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]">
                {/* Chart */}
                <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Recall@10 trend</p>
                      <p className="mt-1 text-xs text-[#8A8A85]">BEIR aggregate, last 8 runs</p>
                    </div>
                    <span className="font-mono text-xs text-[#8A8A85]">skyboy.in/run/8f21ab</span>
                  </div>
                  <svg viewBox="0 0 420 170" className="h-44 w-full" role="img" aria-label="Benchmark trend chart">
                    <defs>
                      <linearGradient id="hero-chart-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[38, 76, 114, 152].map((y) => (
                      <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="rgba(0,0,0,0.06)" />
                    ))}
                    <path
                      d="M 0 132 C 42 124, 58 104, 94 108 C 138 114, 148 76, 188 82 C 226 88, 242 62, 282 64 C 326 66, 342 35, 420 28 L 420 170 L 0 170 Z"
                      fill="url(#hero-chart-fill)"
                    />
                    <path
                      d="M 0 132 C 42 124, 58 104, 94 108 C 138 114, 148 76, 188 82 C 226 88, 242 62, 282 64 C 326 66, 342 35, 420 28"
                      fill="none"
                      stroke="#2563EB"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>

                {/* Metric cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-black/[0.08] bg-white p-3">
                      <p className="text-xs text-[#8A8A85]">{metric.label}</p>
                      <p
                        className={`mt-1 font-mono text-lg ${
                          metric.positive ? "text-[#16A34A]" : "text-[#111110]"
                        }`}
                      >
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
