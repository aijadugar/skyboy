"use client";

import { useRouter } from "next/navigation";
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyHighlight,
  DrawablyUnderline,
} from "drawably/react";
import type { Skill } from "@/lib/catalog";

export function Hero({ feature }: { feature: Skill }) {
  const router = useRouter();
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-24">
      <div>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-pen">
          Skyboy.in
        </p>
        <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          The portable skill directory, minus the{" "}
          <DrawablyUnderline className="whitespace-nowrap">clutter</DrawablyUnderline>.
        </h1>
        <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-body">
          Find, preview, and install <DrawablyHighlight>SKILL.md</DrawablyHighlight>{" "}
          packages across Claude, Cursor, ChatGPT, Gemini CLI, and more.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <DrawablyButton
            variant="solid"
            onClick={() => router.push("/browse")}
          >
            Browse the catalog
          </DrawablyButton>
          <DrawablyButton
            variant="outline"
            onClick={() => router.push("/docs")}
          >
            Read the spec
          </DrawablyButton>
        </div>
      </div>

      <DrawablyCard seed={4242} className="sk-card--bare max-w-sm p-6 lg:justify-self-end">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              {feature.category}
            </p>
            <span className={`sk-badge ${feature.badge === "verified" ? "sk-badge-official" : ""}`}>
              {feature.badge}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-ink">{feature.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-body">{feature.description}</p>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-hairline pt-4">
            <span className="font-mono text-xs text-mute">
              {feature.license} · v{feature.version}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
              Preview → Copy
            </span>
          </div>
        </div>
      </DrawablyCard>
    </section>
  );
}
