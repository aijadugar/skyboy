import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Contact · skyboy.in",
  description:
    "Reach the skyboy.in team. Support and CLI/MCP issues, partnerships and press, or a general catch-all.",
};

const CONTACTS = [
  {
    email: "support@skyboy.in",
    label: "Support",
    blurb:
      "General user and community support — CLI or MCP server issues, install help.",
  },
  {
    email: "hello@skyboy.in",
    label: "Hello",
    blurb:
      "General inquiries, partnerships, and press — anything on the business side.",
  },
  {
    email: "contact@skyboy.in",
    label: "Contact",
    blurb:
      "Catch-all for everything else. If you're unsure where to write, start here.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/contact" />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
          Contact
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Reach the team
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-body">
          Three inboxes, one directory. Pick the one that fits — or use the
          catch-all and we'll route it.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CONTACTS.map((c) => (
            <a
              key={c.email}
              href={`mailto:${c.email}`}
              className="group rounded-sm border border-hairline bg-card p-6 transition-colors hover:border-pen"
            >
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
                {c.label}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-ink">
                {c.email}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-body">{c.blurb}</p>
            </a>
          ))}
        </div>

        <p className="mt-10 max-w-[58ch] text-sm leading-relaxed text-body">
          Security issues in the CLI or MCP server? Mail the catch-all with{" "}
          <span className="text-ink">[security]</span> in the subject and we'll
          prioritize it.
        </p>
      </main>
    </div>
  );
}
