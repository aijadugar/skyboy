"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Node positions in the SVG coordinate space (600 x 340)
const GITHUB_POS = { x: 100, y: 170 };
const HF_POS = { x: 500, y: 170 };
const SKYBOY_POS = { x: 300, y: 280 };

// Quadratic bezier control points for hand-drawn feel
const GITHUB_PATH = `M ${GITHUB_POS.x} ${GITHUB_POS.y} Q 180 310 ${SKYBOY_POS.x} ${SKYBOY_POS.y}`;
const HF_PATH = `M ${HF_POS.x} ${HF_POS.y} Q 420 310 ${SKYBOY_POS.x} ${SKYBOY_POS.y}`;

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="#111110" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function HuggingFaceIcon() {
  return (
    <span className="text-3xl leading-none" aria-hidden="true">
      🤗
    </span>
  );
}

function SkyboyNodeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M10 8 L5.5 16 L10 24" stroke="#111110" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M22 8 L26.5 16 L22 24" stroke="#111110" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M11 17 L14.5 20.5 L21 12" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M16 20 L16 27" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M13.5 24.5 L16 27.5 L18.5 24.5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Node({
  x,
  y,
  icon,
  label,
  sublabel,
  highlight = false,
}: {
  x: number;
  y: number;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <foreignObject x={x - 64} y={y - 52} width="128" height="104">
      <div
        className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center shadow-sm ${
          highlight
            ? "border-[#2563EB]/30 bg-white ring-2 ring-[#2563EB]/10"
            : "border-black/[0.08] bg-white"
        }`}
      >
        <div className="flex size-10 items-center justify-center rounded-xl border border-black/[0.06] bg-[#F7F7F5]">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#111110]">{label}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-[#8A8A85]">{sublabel}</p>
        </div>
      </div>
    </foreignObject>
  );
}

function AnimatedDot({ pathId, delay }: { pathId: string; delay: number }) {
  return (
    <circle r="4" fill="#2563EB" opacity="0.85">
      <animateMotion
        dur="1.8s"
        begin={`${delay}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keySplines="0.4 0 0.6 1"
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </circle>
  );
}

export default function EcosystemAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(false);
          // Small delay to allow CSS reset before re-triggering
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setVisible(true));
          });
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="skyboy-section bg-[#FAFAF8]">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">Ecosystem</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            Everything flows into one score
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#4B4B48]">
            Connect your GitHub SDK and Hugging Face datasets. Skyboy benchmarks them together and produces a single, reproducible leaderboard entry.
          </p>
        </div>

        <div ref={ref} className="mx-auto mt-14 max-w-2xl">
          <svg
            viewBox="0 0 600 380"
            className="w-full"
            role="img"
            aria-label="Ecosystem diagram showing GitHub and Hugging Face connecting to Skyboy"
          >
            {/* Path definitions */}
            <defs>
              <path id="github-path" d={GITHUB_PATH} />
              <path id="hf-path" d={HF_PATH} />
            </defs>

            {/* Connection lines */}
            {visible && (
              <>
                <path
                  d={GITHUB_PATH}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="200"
                  strokeDashoffset="200"
                  opacity="0.4"
                  style={{
                    animation: "draw-line 1s ease forwards",
                  }}
                />
                <path
                  d={HF_PATH}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="200"
                  strokeDashoffset="200"
                  opacity="0.4"
                  style={{
                    animation: "draw-line 1s ease 0.15s forwards",
                  }}
                />
                {/* Animated dots */}
                <AnimatedDot pathId="github-path" delay={1.1} />
                <AnimatedDot pathId="github-path" delay={2.0} />
                <AnimatedDot pathId="hf-path" delay={1.3} />
                <AnimatedDot pathId="hf-path" delay={2.2} />
              </>
            )}

            {/* Nodes */}
            <Node
              x={GITHUB_POS.x}
              y={GITHUB_POS.y}
              icon={<GitHubIcon />}
              label="GitHub"
              sublabel="supermemory SDK"
            />
            <Node
              x={HF_POS.x}
              y={HF_POS.y}
              icon={<HuggingFaceIcon />}
              label="Hugging Face"
              sublabel="LOCOMO · LongMemEval"
            />
            <Node
              x={SKYBOY_POS.x}
              y={SKYBOY_POS.y}
              icon={<SkyboyNodeIcon />}
              label="Skyboy"
              sublabel="Scored leaderboard entry"
              highlight
            />

            {/* Output label */}
            <text
              x={SKYBOY_POS.x}
              y={SKYBOY_POS.y + 68}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
              fontSize="11"
              fill="#2563EB"
              fontWeight="500"
            >
              → Scored leaderboard entry
            </text>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes draw-line {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
}
