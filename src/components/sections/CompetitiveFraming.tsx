"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function CompetitiveFraming() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="skyboy-section bg-[#FAFAF8]">
      <div className="skyboy-container">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-2xl font-semibold tracking-tight text-[#111110] md:text-3xl">
            Why not just use Weights &amp; Biases or MLflow?
          </h2>
          <p className="mt-6 text-base leading-[1.8] text-[#4B4B48]">
            Those tools track experiments. Skyboy benchmarks algorithms &mdash; standardized datasets, reproducible
            scores, public leaderboards, and automatic regression detection. It&apos;s the difference between a lab
            notebook and a CI/CD pipeline for your AI.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
