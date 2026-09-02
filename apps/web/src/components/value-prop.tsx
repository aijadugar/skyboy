"use client";

import { DrawablyCard, DrawablyUnderline } from "drawably/react";

export function ValueProp() {
  // Varied layout, not three equal cards (taste-skill §9G): one wide statement
  // row with a mono index, then an alternating two-column detail strip.
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <DrawablyCard className="sk-card--bare p-8 sm:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
            01 / Curation
          </p>
          <div>
            <h2 className="max-w-[38ch] text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Every entry is hand-<DrawablyUnderline>screened</DrawablyUnderline>,
              not scraped.
            </h2>
            <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-body">
              A small, tight catalog beats a huge noisy one. Each skill ships a
              real permissions manifest, so you know what it touches before you
              run it.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="border-t border-hairline pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              02 / Preview before install
            </p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              The actual SKILL.md renders in-page. No click-through to a raw
              file.
            </p>
          </div>
          <div className="border-t border-hairline pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              03 / Agent-agnostic
            </p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              One portable package, install guides for every major agent. Copy,
              download, or add via CLI.
            </p>
          </div>
        </div>
      </DrawablyCard>
    </section>
  );
}
