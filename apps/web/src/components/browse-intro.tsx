"use client";

import { useState } from "react";

// The /browse intro paragraph. On mobile it reads as a short, smaller block —
// clamped to a few lines with a More/Less disclosure — and opens up to full
// size and full length from sm: upwards, where there's room for it.
export function BrowseIntro() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={`mt-3 text-sm leading-relaxed text-body sm:text-base ${
          expanded ? "" : "line-clamp-3 sm:line-clamp-none"
        }`}
      >
        Every entry in the skyboy.in catalog is a portable SKILL.md package —
        hand-screened by maintainers, never scraped or auto-imported. Tick the
        cards you want and download them as a single bundle, or open any card
        to read the full skill, its permissions, license, and compatible agents
        before you install a thing. Filter by category from the control on the
        right; every selection lives in the URL, so a filtered view is
        shareable exactly as you see it.
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-pen sm:hidden"
      >
        {expanded ? "Less" : "More"}
      </button>
    </div>
  );
}
