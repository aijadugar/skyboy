import Link from "next/link";
import { ComingSoonButton } from "@/components/coming-soon-button";
import { Footer } from "@/components/footer";
import { Headline } from "@/components/headline";
import { SessionDemo } from "@/components/session-demo";
import { SiteNav } from "@/components/site-nav";

const RULES = [
  {
    index: "01",
    title: "Desktop app only",
    body: "Install, open, done. No command line for you, and no browser extension.",
  },
  {
    index: "02",
    title: "Local first",
    body: "Prompts, code, and agent output stay on your machine unless you turn on phone push.",
  },
  {
    index: "03",
    title: "Safe by default",
    body: "Automatic prompts are limited, stoppable, and written to a local log.",
  },
];

const POINTS = [
  {
    title: "An alert when the agent finishes or needs you",
    body: "Task finished, permission, a question, or a failure. Each event can use its own sound, ring, or desktop banner.",
  },
  {
    title: "A queue that keeps the job moving",
    body: "Write the next prompts ahead of time. When a step ends, Skyboy sends the next one, and stops where you marked a pause.",
  },
  {
    title: "One window for every session",
    body: "Project, agent, state, last message, and queue progress. A pause-all control stays visible.",
  },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/" />
      <main>
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
              Desktop notifier for coding agents
            </p>
            <Headline />
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ComingSoonButton />
              <Link
                href="/how-it-works"
                className="font-mono text-xs uppercase tracking-[0.1em] text-body transition-colors hover:text-pen"
              >
                See how it works →
              </Link>
            </div>
            <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-mute">
              The desktop app is not built yet. Coming soon joins the waitlist.
            </p>
          </div>
          <SessionDemo />
        </section>

        <section className="border-y border-hairline bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">Supported now</p>
            <span className="sk-chip sk-chip--active">
              <span className="sk-chip__dot" />
              Claude Code
            </span>
            <span className="sk-chip sk-chip--active">
              <span className="sk-chip__dot" />
              Codex
            </span>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute sm:ml-4">Later</p>
            <span className="sk-chip">Gemini CLI</span>
            <span className="sk-chip">Cursor</span>
            <span className="sk-chip">Linux</span>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 md:grid-cols-3">
          {RULES.map((rule) => (
            <article key={rule.index} className="border-t border-hairline pt-5">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">{rule.index}</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{rule.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-body">{rule.body}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">Why Skyboy</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Stop checking back every few minutes.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-body">
                A long agent task means watching for a permission prompt. Miss it, and the agent
                sits blocked. Small scripts can play a sound. Skyboy is the desktop app: one place
                for alerts, and a queue that continues the work.
              </p>
              <Link
                href="/features"
                className="mt-6 inline-flex font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
              >
                All features →
              </Link>
            </div>
            <ol className="space-y-5">
              {POINTS.map((point, index) => (
                <li key={point.title} className="rounded-md border border-hairline bg-card p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-mute">
                    0{index + 1}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{point.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
