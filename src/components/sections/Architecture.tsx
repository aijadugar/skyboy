import { motion, useReducedMotion, type Variants } from "framer-motion";

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
};

type Connector = {
  id: string;
  d: string;
  delay: number;
};

const nodeHeight = 48;
const centerX = 320;
const mainWidth = 230;
const branchWidth = 190;

const nodes: Node[] = [
  { id: "upload", label: "Upload Algorithm", x: centerX - mainWidth / 2, y: 24, width: mainWidth },
  { id: "sandbox", label: "Sandbox Execution", x: centerX - mainWidth / 2, y: 104, width: mainWidth },
  { id: "dataset", label: "Dataset Registry", x: 84, y: 184, width: branchWidth },
  { id: "orchestrator", label: "Benchmark Orchestrator", x: 366, y: 184, width: branchWidth },
  { id: "metrics", label: "Metric Engine", x: centerX - mainWidth / 2, y: 264, width: mainWidth },
  { id: "baseline", label: "Baseline Comparison", x: centerX - mainWidth / 2, y: 344, width: mainWidth },
  { id: "regression", label: "Regression Detection", x: centerX - mainWidth / 2, y: 424, width: mainWidth },
  { id: "storage", label: "Experiment Storage", x: centerX - mainWidth / 2, y: 504, width: mainWidth },
  { id: "dashboard", label: "Dashboard / Leaderboards", x: centerX - mainWidth / 2, y: 584, width: mainWidth },
  { id: "deploy", label: "Deployment Package", x: centerX - mainWidth / 2, y: 664, width: mainWidth },
];

const connectors: Connector[] = [
  { id: "upload-sandbox", d: "M 320 72 L 320 104", delay: 0.1 },
  { id: "sandbox-dataset", d: "M 320 152 L 179 184", delay: 0.18 },
  { id: "dataset-orchestrator", d: "M 274 208 L 366 208", delay: 0.26 },
  { id: "dataset-metrics", d: "M 179 232 C 179 252 230 264 320 264", delay: 0.34 },
  { id: "metrics-baseline", d: "M 320 312 L 320 344", delay: 0.42 },
  { id: "baseline-regression", d: "M 320 392 L 320 424", delay: 0.5 },
  { id: "regression-storage", d: "M 320 472 L 320 504", delay: 0.58 },
  { id: "storage-dashboard", d: "M 320 552 L 320 584", delay: 0.66 },
  { id: "dashboard-deploy", d: "M 320 632 L 320 664", delay: 0.74 },
];

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.42,
      delay: 0.08 + index * 0.07,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export default function Architecture() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="architecture" className="skyboy-section">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-skyboy-success">Architecture</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-skyboy-text md:text-5xl">
            One pipeline, fully automated
          </h2>
        </div>

        <motion.div
          className="mx-auto mt-14 max-w-4xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-skyboy-text shadow-[0_24px_80px_rgba(59,130,246,0.12)] backdrop-blur sm:p-6"
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
        >
          <svg
            viewBox="0 0 640 736"
            className="h-auto w-full"
            role="img"
            aria-labelledby="architecture-title architecture-description"
          >
            <title id="architecture-title">Skyboy automated algorithm pipeline architecture</title>
            <desc id="architecture-description">
              A simplified top-to-bottom flow from algorithm upload through sandbox execution, datasets, benchmarking,
              metrics, baselines, regression detection, storage, dashboards, and deployment packaging.
            </desc>
            <defs>
              <linearGradient id="architecture-line" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--skyboy-blue)" stopOpacity="0.28" />
                <stop offset="50%" stopColor="var(--skyboy-purple)" stopOpacity="0.78" />
                <stop offset="100%" stopColor="var(--skyboy-cyan)" stopOpacity="0.82" />
              </linearGradient>
              <linearGradient id="architecture-node" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.07" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.025" />
              </linearGradient>
              <filter id="architecture-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="0 0 0 0 0.23 0 0 0 0 0.51 0 0 0 0 0.96 0 0 0 0.42 0"
                />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="architecture-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--skyboy-cyan)" opacity="0.85" />
              </marker>
            </defs>

            <rect x="32" y="8" width="576" height="712" rx="28" fill="currentColor" opacity="0.025" />
            <circle cx="482" cy="138" r="120" fill="var(--skyboy-blue)" opacity="0.06" />
            <circle cx="172" cy="552" r="150" fill="var(--skyboy-purple)" opacity="0.055" />

            {connectors.map((connector) => (
              <motion.path
                key={connector.id}
                d={connector.d}
                fill="none"
                stroke="url(#architecture-line)"
                strokeWidth="3"
                strokeLinecap="round"
                markerEnd="url(#architecture-arrow)"
                filter="url(#architecture-glow)"
                initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                variants={{
                  visible: {
                    pathLength: 1,
                    opacity: 1,
                    transition: {
                      duration: 0.55,
                      delay: connector.delay,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  },
                }}
              />
            ))}

            {nodes.map((node, index) => (
              <motion.g key={node.id} custom={index} variants={reduceMotion ? undefined : nodeVariants}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={nodeHeight}
                  rx="12"
                  fill="url(#architecture-node)"
                  stroke="currentColor"
                  strokeOpacity="0.12"
                />
                <rect
                  x={node.x + 1}
                  y={node.y + 1}
                  width={node.width - 2}
                  height={nodeHeight - 2}
                  rx="11"
                  fill="none"
                  stroke="url(#architecture-line)"
                  strokeOpacity="0.24"
                />
                <text
                  x={node.x + node.width / 2}
                  y={node.y + 30}
                  textAnchor="middle"
                  fill="currentColor"
                  fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
                  fontSize="15"
                  fontWeight="600"
                >
                  {node.label}
                </text>
              </motion.g>
            ))}
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
