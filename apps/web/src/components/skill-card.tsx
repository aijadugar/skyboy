"use client";

import { useRouter } from "next/navigation";
import { DrawablyCard } from "drawably/react";
import type { Skill } from "@/lib/catalog";
import { PermissionsRow } from "@/components/permissions";

export function SkillCard({ skill }: { skill: Skill }) {
  const router = useRouter();
  return (
    <DrawablyCard
      className="sk-card--bare flex h-full flex-col p-6"
      seed={skill.slug.length * 7919}
      onClick={() => router.push(`/skill/${skill.slug}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
          {skill.category}
        </p>
        <span
          className={`sk-badge ${
            skill.badge === "verified" || skill.badge === "official"
              ? "sk-badge-official"
              : ""
          }`}
        >
          {skill.badge}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink">{skill.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
        {skill.description}
      </p>
      <div className="mt-5 border-t border-hairline pt-4">
        <PermissionsRow skill={skill} />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-mute">
            {skill.license} · v{skill.version}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
            Open →
          </span>
        </div>
      </div>
    </DrawablyCard>
  );
}
