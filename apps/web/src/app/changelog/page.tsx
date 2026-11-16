import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Skyboy release history. The desktop app has no published version yet.",
};

const ROADMAP = [
  {
    version: "Now",
    title: "Website",
    items: [
      "Home, features, sounds, docs, FAQ, and privacy",
      "Waitlist, contact, and feature request",
      "Download button in the coming-soon state",
    ],
  },
  {
    version: "v0.1",
    title: "Notifications",
    items: [
      "Claude Code and Codex events, with hook setup in the app",
      "Custom sound with preview, ring, and a desktop notification",
      "Session list and a test button",
      "Windows and macOS",
    ],
  },
  {
    version: "v0.2",
    title: "Prompt queue",
    items: ["Sequential queue with step and time limits", "Pause points", "Audit log"],
  },
  {
    version: "v0.3",
    title: "Phone and safety",
    items: [
      "ntfy phone push",
      "Conditional steps",
      "Pause and resume when an agent hits a usage limit",
      "Git checkpoints",
    ],
  },
  {
    version: "v0.4 and later",
    title: "Further out",
    items: [
      "Templates, voice announcements, webhooks, and escalating alerts",
      "A mobile companion that can reply and approve",
      "Stuck-agent detection",
      "Gemini CLI, Cursor, and Linux",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <PageShell current="/changelog">
      <PageHeader
        eyebrow="Changelog"
        title="No app release yet."
        lede="When an installer ships, this page lists the version, the date, and what changed. The plan below is the order of work, not a set of released builds."
      />

      <article className="mt-12 max-w-2xl border-l-2 border-pen pl-5">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Website replaces the old skyboy.in</h2>
        <p className="mt-2 text-sm leading-relaxed text-body">
          skyboy.in is now the home of the Skyboy desktop notifier. The earlier
          directory of AI skills is no longer part of this site. The download
          button joins the{" "}
          <Link href="/download#waitlist" className="text-pen underline decoration-hairline underline-offset-2 hover:decoration-pen">
            waitlist
          </Link>
          .
        </p>
        <p className="mt-2 font-mono text-xs text-mute">2026-11-16</p>
      </article>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Roadmap</h2>
        <ol className="mt-6 max-w-2xl space-y-8">
          {ROADMAP.map((phase) => (
            <li key={phase.version} className="border-t border-hairline pt-5">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">{phase.version}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{phase.title}</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-body">
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
