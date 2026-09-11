"use client";

import { useEffect, useRef } from "react";
import { DrawablyCheckbox } from "drawably/react";
import type { Plugin } from "@/lib/catalog";
import {
  SelectionProvider,
  useSelection,
  SelectionDownloadButton,
} from "@/components/selection";

// Per-plugin skill selection. Each skill inside the vendor plugin gets a
// hand-drawn checkbox feeding the same shared selection context as /browse;
// the floating bar posts "<plugin>:<skill>" slugs so /api/zip fetches those
// SKILL.md files from the vendor repo at bundle time (plugins are indexed,
// never vendored, so there is nothing on disk to zip).
export function PluginSkillPicker({ plugin }: { plugin: Plugin }) {
  return (
    <SelectionProvider>
      <div className="mb-6 flex items-center justify-end">
        <SelectionDownloadButton />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plugin.skills.map((s) => (
          <PluginSkillCard
            key={s.name}
            pluginSlug={plugin.slug}
            name={s.name}
            description={s.description}
            url={s.url}
          />
        ))}
      </div>
    </SelectionProvider>
  );
}

function PluginSkillCard({
  pluginSlug,
  name,
  description,
  url,
}: {
  pluginSlug: string;
  name: string;
  description: string;
  url: string;
}) {
  const { selected, toggle } = useSelection();
  const composite = `${pluginSlug}:${name}`;
  const checked = selected.includes(composite);
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
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-mute">
          skill
        </p>
        <span ref={checkboxWrapRef} className="shrink-0">
          <DrawablyCheckbox
            seed={name.length * 7919 + pluginSlug.length}
            aria-label={`Select ${name} for download`}
            checked={checked}
            onChange={(e) => toggle(composite, e.target.checked)}
          />
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-ink">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">
        {description || "Preview the SKILL.md in the vendor repo."}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.1em] text-pen"
      >
        Preview in repo →
      </a>
    </div>
  );
}
