import type { Skill } from "@/lib/catalog";

const PERM_META = [
  { key: "network", label: "network", off: "no net" },
  { key: "filesystem_write_outside_target", label: "fs write", off: "no fs write" },
  { key: "shell_exec", label: "shell", off: "no shell" },
] as const;

// Compact icon row of what a skill's bundled scripts may touch (brief §12.1).
// "off" states read as negatives so a mostly-clean skill reads clean at a glance.
export function PermissionsRow({ skill }: { skill: Skill }) {
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
