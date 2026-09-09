"use client";

import { useRouter } from "next/navigation";
import { DrawablyCard } from "drawably/react";
import type { Skill } from "@/lib/catalog";

export function SkillCard({ skill }: { skill: Skill }) {
  const router = useRouter();
  return (
    <DrawablyCard
      className="sk-card--bare flex h-full cursor-pointer flex-col p-6"
      seed={skill.slug.length * 7919}
      onClick={() => router.push(`/skill/${skill.slug}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
          {skill.category}
        </p>
        <span
          className={`sk-badge ${
            skill.badge === "official" || skill.badge === "verified"
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
      <span className="mt-5 font-mono text-xs uppercase tracking-[0.1em] text-pen">
        Open →
      </span>
    </DrawablyCard>
  );
}
