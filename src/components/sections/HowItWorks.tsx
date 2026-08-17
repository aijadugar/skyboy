import { motion, useReducedMotion, type Variants } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Push",
    description: "Push your algorithm via CLI or Git. Skyboy detects the entry point automatically.",
    code: `$ sb push
Detecting entry point...
Found main.py`,
  },
  {
    number: "02",
    title: "Sandbox run",
    description: "Skyboy runs it against benchmark datasets (LOCOMO, LongMemEval, BEIR) in an isolated sandbox.",
    code: `$ sb run --bench locomo
Isolating sandbox...
Running LOCOMO (1/5)...`,
  },
  {
    number: "03",
    title: "Score & regression flag",
    description: "Get a score, see the diff against your last run, and get flagged immediately if you regressed.",
    code: `Recall@10: 0.847 ↑
NDCG@10:  0.792 →
Latency:  42ms ↓`,
  },
] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.06,
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
    <section id="how-it-works" className="skyboy-section bg-[#FAFAF8]">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            From push to score in three steps
          </h2>
        </div>

        <motion.div
          className="mx-auto mt-14 grid max-w-4xl gap-5 lg:grid-cols-3"
          variants={reduceMotion ? undefined : containerVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, index) => (
            <motion.div key={step.title} variants={stepVariants} className="relative flex gap-5 lg:flex-col lg:gap-0">
              {/* Arrow connector between steps (desktop) */}
              {index < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute -right-3 top-6 hidden items-center lg:flex"
                >
                  <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
                    <path
                      d="M0 8 Q8 7 16 8"
                      stroke="#2563EB"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M13 5 L17 8 L13 11"
                      stroke="#2563EB"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              )}

              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white font-mono text-sm font-medium text-[#8A8A85] lg:mb-5">
                {step.number}
              </div>

              <div className="flex flex-1 flex-col rounded-2xl border border-black/[0.08] bg-white p-5">
                <h3 className="text-lg font-semibold text-[#111110]">{step.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#4B4B48]">{step.description}</p>
                <div className="mt-5 rounded-lg border border-black/[0.06] bg-[#F7F7F5] px-3 py-2">
                  <pre className="font-mono text-xs text-[#2563EB] whitespace-pre">{step.code}</pre>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
