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
  featured: boolean;
};

const features: Feature[] = [
  {
    title: "Algorithm Registry",
    description: "Version every algorithm like code. Full history, changelogs, and rollback built in.",
    icon: GitBranch,
    featured: false,
  },
  {
    title: "Benchmark Engine",
    description: "Run any algorithm against any dataset with any metric, automatically orchestrated.",
    icon: Gauge,
    featured: true,
  },
  {
    title: "Dataset Registry",
    description: "Public benchmarks like BEIR and MTEB, plus private and synthetic datasets, all versioned.",
    icon: Database,
    featured: false,
  },
  {
    title: "Experiment Tracking",
    description: "Every run captured - runtime, cost, accuracy, and full output - permanently.",
    icon: FlaskConical,
    featured: false,
  },
  {
    title: "Leaderboards",
    description: "Public, private, or team leaderboards that update the moment a new run finishes.",
    icon: Trophy,
    featured: false,
  },
  {
    title: "Regression Detection",
    description: "Get alerted the moment a metric drops, with the exact commit responsible.",
    icon: AlertTriangle,
    featured: true,
  },
  {
    title: "Deployment Packaging",
    description: "Export a production-ready container the moment your numbers are ready.",
    icon: Package,
    featured: false,
  },
  {
    title: "Visual Reports",
    description: "Precision-recall curves, NDCG, latency, and cost - generated automatically, every run.",
    icon: BarChart3,
    featured: false,
  },
  {
    title: "Sandbox Execution",
    description: "Every algorithm runs isolated, reproducible, and secure - no shared state, no surprises.",
    icon: ShieldCheck,
    featured: false,
  },
  {
    title: "Plugin SDK",
    description: "Bring your own algorithm, dataset adapter, or metric with a lightweight, typed interface.",
    icon: Puzzle,
    featured: false,
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
      className={`group relative flex flex-col rounded-2xl border border-black/[0.08] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-black/[0.16] ${
        feature.featured ? "md:row-span-2 min-h-72" : "min-h-56"
      }`}
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-[#2563EB]/30 bg-transparent text-[#2563EB]">
        <Icon className="size-5" aria-hidden="true" strokeWidth={1.5} />
      </div>
      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="text-lg font-semibold text-[#111110]">{feature.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-[#4B4B48]">{feature.description}</p>
      </div>
    </motion.article>
  );
}

export default function Features() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="platform" className="skyboy-section bg-white">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">Platform</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            Everything algorithm engineering needs, built in
          </h2>
        </div>

        <motion.div
          className="mt-14 grid auto-rows-[minmax(0,_1fr)] gap-5 md:grid-cols-2 lg:grid-cols-3"
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
