"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DrawablyCard, DrawablyCheckbox } from "drawably/react";
import type { Skill } from "@/lib/catalog";
import { useSelection } from "@/components/selection";

// A catalog card that doubles as a selection target: the hand-drawn checkbox
// picks the skill for the floating "Download Selected as ZIP" bar, clicking
// the card body still opens the detail page. The checkbox is stop-propagated
// so ticking it never navigates. Outside a SelectionProvider (e.g. the landing
// page's featured row) the checkbox hides and the card is plain navigation.
export function SkillCard({ skill }: { skill: Skill }) {
  const router = useRouter();
  const selection = useSelectionSafe();
  const checked = selection ? selection.selected.includes(skill.id) : false;
  const checkboxWrapRef = useRef<HTMLSpanElement>(null);

  // Dispatch a native change event so drawably picks up programmatic
  // checked changes (e.g. when "Clear" resets the selection state).
  useEffect(() => {
    const input = checkboxWrapRef.current?.querySelector("input");
    if (input) input.dispatchEvent(new Event("change", { bubbles: true }));
  }, [checked]);

  return (
    <DrawablyCard
      className="sk-card--bare flex h-full cursor-pointer flex-col p-6"
      seed={skill.slug.length * 7919}
      onClick={() => router.push(skill.isProvider ? `/provider/${skill.slug}` : `/skill/${skill.slug}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
          {skill.isProvider ? "model provider" : skill.category}
        </p>
        {selection ? (
          <span ref={checkboxWrapRef} className="shrink-0">
            <DrawablyCheckbox
              seed={skill.slug.length * 104729 + 7}
              aria-label={`Select ${skill.name} for download`}
              checked={checked}
              onChange={(e) => selection.toggle(skill.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </span>
        ) : (
          <span
            className={`sk-badge ${
              skill.badge === "official" || skill.badge === "verified"
                ? "sk-badge-official"
                : ""
            }`}
          >
            {skill.badge}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink">{skill.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
        {skill.description}
      </p>
      {skill.isProvider ? (
        <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
          <span className="font-mono text-xs text-mute">
            {skill.providerSkillCount} skill{skill.providerSkillCount === 1 ? "" : "s"}
            {" · "}
            {skill.providerPluginCount} plugin{skill.providerPluginCount === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
            Browse provider →
          </span>
        </div>
      ) : (
        <span className="mt-5 font-mono text-xs uppercase tracking-[0.1em] text-pen">
          Open →
        </span>
      )}
    </DrawablyCard>
  );
}

// Context is optional for this card: it renders both inside the /browse
// SelectionProvider and on the landing page without one.
function useSelectionSafe() {
  try {
    return useSelection();
  } catch {
    return null;
  }
}
