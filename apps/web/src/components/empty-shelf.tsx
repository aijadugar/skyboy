"use client";

import { useRouter } from "next/navigation";
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyHighlight,
  DrawablyUnderline,
} from "drawably/react";

// The "empty shelf" card. When a category (or a provider's skills
// section) holds nothing, we don't show a sad paragraph — we show a tiny
// hand-drawn vacancy sign inviting the visitor to be the first entry. Copy
// rotates deterministically from a seed so SSR and client agree.
type ShelfKind = "skills" | "category";

const COPY: Record<
  ShelfKind,
  { title: string; body: string; cta: string }[]
> = {
  skills: [
    {
      title: "Certified ghost town.",
      body: "Not a single skill has moved in here yet. If your agents have one you're proud of, this blank space has your name on it.",
      cta: "Contribute a skill",
    },
    {
      title: "The shelf is suspiciously bare.",
      body: "Zero skills indexed. Yours could be the first card on this wall — CI checks it, we do the stamping.",
      cta: "Contribute a skill",
    },
    {
      title: "This section runs on enthusiasm. Currently: none.",
      body: "Drop a SKILL.md in via a pull request and quietly set the bar for whoever follows.",
      cta: "Raise the bar",
    },
  ],
  category: [
    {
      title: "Nothing matches. Nature abhors a vacuum.",
      body: "This filter corner holds zero skills. Clear the filters — or fill the void yourself with one pull request.",
      cta: "Contribute something",
    },
    {
      title: "Bold of you to filter into an empty room.",
      body: "Every category started exactly like this one. Yours could start the next — it's a folder and a PR away.",
      cta: "Start a category",
    },
  ],
};

// Deterministic 32-bit string hash — seed the shake, same on server and client.
export function shelfSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function EmptyShelf({
  kind,
  seedInput,
}: {
  kind: ShelfKind;
  seedInput: string;
}) {
  const router = useRouter();
  const seed = shelfSeed(seedInput);
  const copy = COPY[kind][seed % COPY[kind].length];

  return (
    <DrawablyCard
      seed={seed}
      className="sk-card--bare rounded-sm border border-dashed border-hairline bg-card p-6 sm:p-8"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-[52ch]">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
            Empty shelf · 0 entries
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            <DrawablyUnderline seed={seed + 1}>{copy.title}</DrawablyUnderline>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-body">
            This is a{" "}
            <DrawablyHighlight seed={seed + 2}>vacancy sign</DrawablyHighlight>{" "}
            — {copy.body}
          </p>
        </div>
        <DrawablyButton
          seed={seed + 3}
          variant="outline"
          className="shrink-0"
          onClick={() => router.push("/submit")}
        >
          {copy.cta} →
        </DrawablyButton>
      </div>
    </DrawablyCard>
  );
}
