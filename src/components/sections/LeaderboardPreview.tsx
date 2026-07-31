"use client";

import { motion, useReducedMotion } from "framer-motion";

type TrendDirection = "up" | "down" | "flat";

const rows = [
  { sdk: "supermemory", dataset: "LOCOMO", score: "0.847", commit: "a3f21bc", trend: "up" as TrendDirection },
  { sdk: "mem0", dataset: "LongMemEval", score: "0.791", commit: "9d4e2f1", trend: "up" as TrendDirection },
  { sdk: "zep", dataset: "LOCOMO", score: "0.743", commit: "c8b3a92", trend: "flat" as TrendDirection },
  { sdk: "letta", dataset: "LongMemEval", score: "0.698", commit: "f1e7d43", trend: "down" as TrendDirection },
  { sdk: "memgpt", dataset: "LOCOMO", score: "0.672", commit: "b2a9c84", trend: "down" as TrendDirection },
] as const;

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === "up") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Trending up">
        <path
          d="M8 13 L8 4"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5 7 L8 4 L11 7"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (direction === "down") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Trending down">
        <path
          d="M8 3 L8 12"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5 9 L8 12 L11 9"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Flat">
      <path
        d="M3 8 L13 8"
        stroke="#8A8A85"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LeaderboardPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="leaderboard" className="skyboy-section bg-white">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">Leaderboard</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            Live leaderboard
          </h2>
          <p className="mt-5 text-base text-[#4B4B48]">Updated on every push.</p>
        </div>

        <motion.div
          className="mx-auto mt-12 max-w-4xl"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.08] bg-[#F7F7F5]">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8A85]">
                    SDK
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8A85]">
                    Dataset
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8A85]">
                    Score
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8A85] sm:table-cell">
                    Commit
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8A85]">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.sdk}
                    className={`border-b border-black/[0.06] transition hover:bg-[#F7F7F5] ${
                      i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"
                    } last:border-0`}
                  >
                    <td className="px-5 py-3.5 font-medium text-[#111110]">{row.sdk}</td>
                    <td className="px-5 py-3.5 text-[#4B4B48]">{row.dataset}</td>
                    <td className="px-5 py-3.5 font-mono text-[#111110]">{row.score}</td>
                    <td className="hidden px-5 py-3.5 font-mono text-xs text-[#8A8A85] sm:table-cell">
                      {row.commit}
                    </td>
                    <td className="px-5 py-3.5">
                      <TrendArrow direction={row.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 text-center">
            <a
              href="#leaderboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline underline-offset-4"
            >
              View full leaderboard &rarr;
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
