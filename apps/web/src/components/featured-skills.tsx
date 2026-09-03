"use client";

import type { Skill } from "@/lib/catalog";
import { SkillCard } from "@/components/skill-card";

export function FeaturedSkills({ skills }: { skills: Skill[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
            Curated start
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            A hand-drawn hand first
          </h2>
        </div>
        <a
          href="/browse"
          className="font-mono text-xs uppercase tracking-[0.1em] text-pen"
        >
          View all →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {skills.map((skill) => (
          <SkillCard key={skill.slug} skill={skill} />
        ))}
      </div>
    </section>
  );
}
