"use client";

import { useEffect, useRef } from "react";
import { DrawablyCheckbox } from "drawably/react";
import type { Skill } from "@/lib/catalog";
import { EmptyShelf } from "@/components/empty-shelf";
import {
  SelectionProvider,
  useSelection,
  SelectionDownloadButton,
} from "@/components/selection";

// Contents of a model provider: the skills that live inside the provider
// folder. Skills are nested catalog entries — tick them to pull their
// SKILL.md files into one ZIP via the shared selection bar.
export function ProviderContents({
  providerSlug,
  skills,
}: {
  providerSlug: string;
  skills: Skill[];
}) {
  return (
    <SelectionProvider>
      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Skills in this provider
            <span className="ml-2 text-sm font-normal text-ink">
              ({skills.length} skill{skills.length === 1 ? "" : "s"})
            </span>
          </h2>
          <SelectionDownloadButton />
        </div>
        {skills.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((s) => (
              <ProviderSkillCard key={`${providerSlug}/${s.slug}`} skill={s} />
            ))}
          </div>
        ) : (
          <EmptyShelf kind="skills" seedInput={`${providerSlug}/skills`} />
        )}
      </section>
    </SelectionProvider>
  );
}

function ProviderSkillCard({ skill }: { skill: Skill }) {
  const { selected, toggle } = useSelection();
  const checked = selected.includes(skill.id);
  const checkboxWrapRef = useRef<HTMLSpanElement>(null);

  // Dispatch a native change event so drawably picks up programmatic
  // checked changes (e.g. when "Clear" resets the selection state).
  useEffect(() => {
    const input = checkboxWrapRef.current?.querySelector("input");
    if (input) input.dispatchEvent(new Event("change", { bubbles: true }));
  }, [checked]);

  return (
    <div className="group rounded-sm border border-hairline bg-card p-5 transition-colors hover:border-pen">
      <div className="flex items-start justify-between gap-3">
        <a
          href={`/skill/${skill.slug}`}
          className="font-mono text-xs uppercase tracking-[0.1em] text-mute transition-colors hover:text-pen"
        >
          skill
        </a>
        <span ref={checkboxWrapRef} className="shrink-0">
          <DrawablyCheckbox
            seed={skill.slug.length * 7919 + 3}
            aria-label={`Select ${skill.name} for download`}
            checked={checked}
            onChange={(e) => toggle(skill.id, e.target.checked)}
          />
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-ink">{skill.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{skill.description}</p>
      <a
        href={`/skill/${skill.slug}`}
        className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.1em] text-pen"
      >
        Open →
      </a>
    </div>
  );
}
