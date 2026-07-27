import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Database,
  FlaskConical,
  Home,
  Settings,
  Trophy,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type ChartPoint = {
  x: number;
  y: number;
  label?: string;
};

type LeaderboardRow = {
  rank: number;
  algorithm: string;
  score: string;
  delta: string;
  active?: boolean;
};

const stats = [
  { label: "Recall@10", value: "0.847", delta: "+2.1%", trend: "up", tone: "text-skyboy-success" },
  { label: "NDCG@10", value: "0.791", delta: "+1.4%", trend: "up", tone: "text-skyboy-success" },
  { label: "Latency", value: "42ms", delta: "-8ms", trend: "up", tone: "text-skyboy-success" },
  { label: "Cost/1k queries", value: "$0.018", delta: "+$0.002", trend: "down", tone: "text-skyboy-warning" },
] as const;

const leaderboard: LeaderboardRow[] = [
  { rank: 1, algorithm: "hybrid-retriever", score: "0.847", delta: "+2.1%", active: true },
  { rank: 2, algorithm: "dense-rerank-v2", score: "0.832", delta: "+0.6%" },
  { rank: 3, algorithm: "bm25-cross-enc", score: "0.818", delta: "-0.3%" },
  { rank: 4, algorithm: "splade-lite", score: "0.804", delta: "+0.2%" },
  { rank: 5, algorithm: "colbert-prod", score: "0.798", delta: "-1.1%" },
] as const;

const navItems = [
  { label: "Overview", icon: Home },
  { label: "Runs", icon: FlaskConical },
  { label: "Leaderboards", icon: Trophy },
  { label: "Datasets", icon: Database },
  { label: "Settings", icon: Settings },
] as const;

const chartPoints: ChartPoint[] = [
  { x: 32, y: 152, label: "0.782" },
  { x: 76, y: 140 },
  { x: 120, y: 128, label: "0.801" },
  { x: 164, y: 134 },
  { x: 208, y: 112 },
  { x: 252, y: 102, label: "0.821" },
  { x: 296, y: 96 },
  { x: 340, y: 78 },
  { x: 384, y: 68 },
  { x: 428, y: 48, label: "0.847" },
] as const;

const chartPath =
  "M 32 152 C 54 148, 56 142, 76 140 C 98 138, 102 128, 120 128 C 144 128, 146 136, 164 134 C 188 132, 186 116, 208 112 C 230 108, 232 102, 252 102 C 274 102, 276 96, 296 96 C 320 96, 318 82, 340 78 C 362 74, 364 70, 384 68 C 406 66, 406 52, 428 48";

const areaPath = `${chartPath} L 428 184 L 32 184 Z`;

export default function DashboardPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="product" className="skyboy-section">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-skyboy-success">Product</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-skyboy-text md:text-5xl">
            See everything, in one place
          </h2>
          <p className="mt-6 text-base leading-8 text-skyboy-text-secondary md:text-lg">
            Skyboy gives every team one dashboard for leaderboards, experiment history, and metric trends. See what
            changed, why it changed, and whether it is ready to ship.
          </p>
        </div>

        <motion.div
          className="group relative mx-auto mt-14 max-w-6xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-[0_30px_100px_rgba(59,130,246,0.14)] backdrop-blur transition duration-200 hover:border-white/[0.16] sm:p-4"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 18 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-50 blur-2xl transition-opacity duration-200 group-hover:opacity-80"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.22), rgba(139, 92, 246, 0.12) 42%, transparent 72%)",
            }}
          />

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-skyboy-background/80">
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-skyboy-warning/80" />
                <span className="size-2.5 rounded-full bg-skyboy-cyan/70" />
                <span className="size-2.5 rounded-full bg-skyboy-success/80" />
              </div>
              <div className="flex min-w-0 flex-1 items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-skyboy-text-muted">
                skyboy.in/dashboard
              </div>
            </div>

            <div className="flex min-h-[650px]">
              <aside className="hidden w-16 shrink-0 flex-col items-center gap-3 border-r border-white/[0.08] bg-white/[0.02] px-3 py-5 sm:flex">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      className={`flex size-10 items-center justify-center rounded-lg border transition ${
                        index === 0
                          ? "border-white/[0.14] bg-white/[0.08] text-skyboy-text"
                          : "border-transparent text-skyboy-text-muted hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-skyboy-text"
                      }`}
                      aria-label={item.label}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </aside>

              <div className="min-w-0 flex-1 p-4 sm:p-6">
                <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-skyboy-text-muted">Algorithm</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-skyboy-text">hybrid-retriever</h3>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-skyboy-success">
                        v0.3.2
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-skyboy-success/20 bg-skyboy-success/10 px-3 py-1.5 text-sm text-skyboy-success">
                    <span className="size-2 rounded-full bg-skyboy-success" />
                    Clean run
                  </div>
                </header>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => {
                    const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight;
                    return (
                      <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-skyboy-text-muted">{stat.label}</p>
                          <span className={`inline-flex items-center gap-1 font-mono text-xs ${stat.tone}`}>
                            <TrendIcon className="size-3" />
                            {stat.delta}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-2xl text-skyboy-text">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-skyboy-text">Recall@10 over last 10 runs</p>
                        <p className="mt-1 text-xs text-skyboy-text-muted">BEIR aggregate score</p>
                      </div>
                      <BarChart3 className="size-5 text-skyboy-text-muted" />
                    </div>

                    <svg viewBox="0 0 460 220" className="h-72 w-full" role="img" aria-label="Recall trending upward">
                      <defs>
                        <linearGradient id="dashboard-chart-line" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="var(--skyboy-blue)" />
                          <stop offset="56%" stopColor="var(--skyboy-purple)" />
                          <stop offset="100%" stopColor="var(--skyboy-cyan)" />
                        </linearGradient>
                        <linearGradient id="dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--skyboy-blue)" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="var(--skyboy-cyan)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[48, 82, 116, 150, 184].map((y) => (
                        <line key={y} x1="24" x2="440" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.07" />
                      ))}
                      {[32, 120, 208, 296, 384].map((x, index) => (
                        <text
                          key={x}
                          x={x}
                          y="210"
                          fill="currentColor"
                          opacity="0.42"
                          fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                          fontSize="10"
                        >
                          r{index * 2 + 1}
                        </text>
                      ))}
                      <path d={areaPath} fill="url(#dashboard-chart-fill)" />
                      <motion.path
                        d={chartPath}
                        fill="none"
                        stroke="url(#dashboard-chart-line)"
                        strokeLinecap="round"
                        strokeWidth="4"
                        initial={reduceMotion ? false : { pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true, margin: "-120px" }}
                        transition={{ duration: 1.15, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      />
                      {chartPoints.map((point) => (
                        <g key={`${point.x}-${point.y}`}>
                          <circle cx={point.x} cy={point.y} r="4" fill="var(--skyboy-background)" stroke="var(--skyboy-cyan)" strokeWidth="2" />
                          {point.label && (
                            <text
                              x={point.x}
                              y={point.y - 12}
                              textAnchor="middle"
                              fill="currentColor"
                              opacity="0.72"
                              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                              fontSize="11"
                            >
                              {point.label}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-skyboy-text">Leaderboard</p>
                        <p className="mt-1 text-xs text-skyboy-text-muted">Private ranking benchmark</p>
                      </div>
                      <Trophy className="size-5 text-skyboy-text-muted" />
                    </div>

                    <div className="space-y-2">
                      {leaderboard.map((row) => (
                        <div
                          key={row.algorithm}
                          className={`relative grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg border px-3 py-3 text-sm ${
                            row.active
                              ? "border-transparent bg-white/[0.05] text-skyboy-text before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-gradient-accent before:p-px"
                              : "border-white/[0.06] bg-white/[0.02] text-skyboy-text-secondary"
                          }`}
                        >
                          <span className="font-mono text-xs text-skyboy-text-muted">#{row.rank}</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{row.algorithm}</p>
                            <p className="mt-0.5 font-mono text-xs text-skyboy-text-muted">Recall@10</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-skyboy-text">{row.score}</p>
                            <p className={row.delta.startsWith("+") ? "font-mono text-xs text-skyboy-success" : "font-mono text-xs text-skyboy-warning"}>
                              {row.delta}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
