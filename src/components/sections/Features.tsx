import {
  AlertTriangle,
  BarChart3,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Package,
  Puzzle,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const features: Feature[] = [
  {
    title: "Algorithm Registry",
    description: "Version every algorithm like code. Full history, changelogs, and rollback built in.",
    icon: GitBranch,
  },
  {
    title: "Benchmark Engine",
    description: "Run any algorithm against any dataset with any metric, automatically orchestrated.",
    icon: Gauge,
  },
  {
    title: "Dataset Registry",
    description: "Public benchmarks like BEIR and MTEB, plus private and synthetic datasets, all versioned.",
    icon: Database,
  },
  {
    title: "Experiment Tracking",
    description: "Every run captured - runtime, cost, accuracy, and full output - permanently.",
    icon: FlaskConical,
  },
  {
    title: "Leaderboards",
    description: "Public, private, or team leaderboards that update the moment a new run finishes.",
    icon: Trophy,
  },
  {
    title: "Regression Detection",
    description: "Get alerted the moment a metric drops, with the exact commit responsible.",
    icon: AlertTriangle,
  },
  {
    title: "Deployment Packaging",
    description: "Export a production-ready container the moment your numbers are ready.",
    icon: Package,
  },
  {
    title: "Visual Reports",
    description: "Precision-recall curves, NDCG, latency, and cost - generated automatically, every run.",
    icon: BarChart3,
  },
  {
    title: "Sandbox Execution",
    description: "Every algorithm runs isolated, reproducible, and secure - no shared state, no surprises.",
    icon: ShieldCheck,
  },
  {
    title: "Plugin SDK",
    description: "Bring your own algorithm, dataset adapter, or metric with a lightweight, typed interface.",
    icon: Puzzle,
  },
];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <motion.article
      variants={cardVariants}
      className="group relative flex min-h-64 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-white/[0.16]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-0 blur-2xl transition-opacity duration-200 group-hover:opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.22), rgba(139, 92, 246, 0.12) 42%, transparent 72%)",
        }}
      />
      <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-skyboy-text">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="text-lg font-semibold text-skyboy-text">{feature.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-skyboy-text-secondary">{feature.description}</p>
      </div>
    </motion.article>
  );
}

export default function Features() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="platform" className="skyboy-section">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-skyboy-success">Platform</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-skyboy-text md:text-5xl">
            Everything algorithm engineering needs, built in
          </h2>
        </div>

        <motion.div
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          variants={reduceMotion ? undefined : gridVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
