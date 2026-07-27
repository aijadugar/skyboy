import { Activity, AlertTriangle, GitCompare, Rocket, Upload } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const steps = [
  {
    title: "Upload",
    description: "Push your algorithm via CLI or Git. Skyboy detects the entry point automatically.",
    icon: Upload,
  },
  {
    title: "Benchmark",
    description: "Runs against standardized datasets (BEIR, MTEB, or your own private eval sets) inside an isolated sandbox.",
    icon: Activity,
  },
  {
    title: "Compare",
    description: "Every run is scored against baselines and your own previous versions - no manual spreadsheet diffing.",
    icon: GitCompare,
  },
  {
    title: "Detect Regressions",
    description: "Skyboy flags metric drops the moment they happen, with the exact commit that caused them.",
    icon: AlertTriangle,
  },
  {
    title: "Deploy",
    description: "Export a production-ready container the moment you're confident in the numbers.",
    icon: Rocket,
  },
] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="skyboy-section">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-skyboy-success">How It Works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-skyboy-text md:text-5xl">
            From push to production in five steps
          </h2>
        </div>

        <motion.div
          className="mx-auto mt-14 grid max-w-4xl gap-5 lg:max-w-none lg:grid-cols-5 lg:gap-4"
          variants={reduceMotion ? undefined : containerVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <motion.div key={step.title} variants={stepVariants} className="relative">
                {!isLast && (
                  <>
                    <motion.span
                      aria-hidden="true"
                      className="absolute left-6 top-14 h-[calc(100%+1.25rem)] w-px origin-top bg-gradient-to-b from-skyboy-blue via-skyboy-purple to-skyboy-cyan lg:hidden"
                      initial={reduceMotion ? false : { scaleY: 0 }}
                      whileInView={reduceMotion ? { scaleY: 1 } : { scaleY: 1 }}
                      viewport={{ once: true, margin: "-120px" }}
                      transition={{ duration: 0.45, delay: 0.18 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <motion.span
                      aria-hidden="true"
                      className="absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-6 hidden h-px origin-left bg-gradient-to-r from-skyboy-blue via-skyboy-purple to-skyboy-cyan lg:block"
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      whileInView={reduceMotion ? { scaleX: 1 } : { scaleX: 1 }}
                      viewport={{ once: true, margin: "-120px" }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </>
                )}

                <div className="relative z-10 flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur transition duration-200 hover:border-white/[0.16] lg:min-h-80 lg:flex-col lg:items-start">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-skyboy-surface font-mono text-sm text-skyboy-text shadow-[0_0_28px_rgba(59,130,246,0.18)]">
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="sr-only">Step {index + 1}</span>
                  </div>

                  <div>
                    <p className="font-mono text-xs text-skyboy-text-muted">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-2 text-lg font-semibold text-skyboy-text">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-skyboy-text-secondary">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
