"use client";

import { useRouter } from "next/navigation";
import { DrawablyCard } from "drawably/react";
import type { Skill } from "@/lib/catalog";

const PERM_META = [
  { key: "network", label: "network", off: "no net" },
  { key: "filesystem_write_outside_target", label: "fs write", off: "no fs write" },
  { key: "shell_exec", label: "shell", off: "no shell" },
] as const;

function PermissionsRow({ skill }: { skill: Skill }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PERM_META.map((p) => {
        const on = skill.permissions[p.key];
        return (
          <span
            key={p.key}
            className={`sk-badge ${on ? "sk-badge-official" : ""}`}
            title={`${p.label}: ${on ? "yes" : "no"}`}
          >
            {on ? p.label : p.off}
          </span>
        );
      })}
      {skill.permissions.env_read.length > 0 ? (
        <span
          className="sk-badge sk-badge-official"
          title={`environments read: ${skill.permissions.env_read.join(", ")}`}
        >
          env
        </span>
      ) : (
        <span className="sk-badge" title="no environment reads">
          no env
        </span>
      )}
    </div>
  );
}

export function FeaturedSkills({ skills }: { skills: Skill[] }) {
  const router = useRouter();
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
          <DrawablyCard
            key={skill.slug}
            className="sk-card--bare flex flex-col p-6"
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
        ))}
      </div>
    </section>
  );
}
