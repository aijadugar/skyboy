"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const researchers = {
  heading: "Researchers & Students",
  subheading: "Free tier — public benchmarks",
  features: [
    "Public projects & open leaderboards",
    "Standard datasets (LOCOMO, LongMemEval, BEIR)",
    "Community leaderboard",
    "CLI access",
    "Experiment history",
  ],
  cta: "Get started free",
  ctaHref: "/signup",
  accent: false,
};

const companies = {
  heading: "Companies & Labs",
  subheading: "Private benchmarks · dedicated compute",
  features: [
    "Private repositories & leaderboards",
    "Custom datasets & benchmark suites",
    "CI/CD integration",
    "Dedicated compute",
    "Team collaboration & RBAC",
    "SLA support",
  ],
  cta: "Talk to us",
  ctaHref: "mailto:hello@skyboy.in",
  accent: true,
};

function Column({
  col,
}: {
  col: typeof researchers | typeof companies;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-8 ${
        col.accent
          ? "border-[#2563EB]/25 bg-white ring-1 ring-[#2563EB]/10"
          : "border-black/[0.08] bg-white"
      }`}
    >
      <div>
        <h3 className="text-xl font-semibold text-[#111110]">{col.heading}</h3>
        <p className="mt-2 text-sm text-[#8A8A85]">{col.subheading}</p>
      </div>

      <ul className="mt-8 flex flex-1 flex-col gap-3">
        {col.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-[#4B4B48]">
            <Check
              className="mt-0.5 size-4 shrink-0 text-[#2563EB]"
              aria-hidden="true"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={col.ctaHref}
        className={`mt-8 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition ${
          col.accent
            ? "bg-[#111110] text-white hover:bg-[#2a2a28]"
            : "border border-black/[0.12] bg-[#F7F7F5] text-[#111110] hover:bg-[#EBEBEA]"
        }`}
      >
        {col.cta}
      </a>
    </div>
  );
}

export default function WhoItsFor() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="skyboy-section bg-white">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">Who it&apos;s for</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            Built for everyone who ships AI
          </h2>
        </div>

        <motion.div
          className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Column col={researchers} />
          <Column col={companies} />
        </motion.div>
      </div>
    </section>
  );
}
