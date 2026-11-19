import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Alert styles, a prompt queue, a session dashboard, and safety controls for Claude Code and Codex.",
};

const EVENTS = [
  ["Task finished", "The agent completed its turn and is waiting."],
  ["Needs permission", "The agent is blocked on an approval prompt."],
  ["Needs input", "The agent asked you a question."],
  ["Error or stuck", "A failure, or no activity for a set time. Stuck detection is planned."],
];

const ALERTS = [
  [
    "Custom sound",
    "A built-in sound or your own audio file. Volume, and a different sound per agent and per event. Preview it before you choose it.",
  ],
  [
    "Ring",
    "Repeats until you dismiss it. Set the interval, a delay before it starts, and a maximum duration.",
  ],
  [
    "Desktop notification",
    "A native banner with the project name and the agent's last message. Clicking it to focus the right window is planned.",
  ],
  ["Voice announcement", "Planned. A short spoken line, such as “Claude Code finished in my-app.”"],
  ["Phone push", "A push to your phone when you leave the desk. Off until you turn it on."],
  ["Webhook", "Planned. Post to a URL you provide, so an event can reach Slack or another tool."],
  ["Quiet hours", "Mute or downgrade alerts on a schedule."],
  [
    "Escalation",
    "Planned. Sound, then ring, then phone push if you have not responded after a set number of minutes.",
  ],
  ["Test button", "Check sound, notification, and phone push without involving an agent."],
];

export default function FeaturesPage() {
  return (
    <PageShell current="/features">
      <PageHeader
        eyebrow="Features"
        title="Alerts, a queue, and a stop button."
        lede="Skyboy tells you when a coding agent finishes or needs you, then can send the next prompt you already wrote. Anything marked planned is not in the app yet."
      />

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">When it notifies you</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EVENTS.map(([title, body]) => (
            <article key={title} className="rounded-md border border-hairline bg-card p-5">
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Alert styles</h2>
        <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-body">
          Claude Code and Codex share defaults, and each agent can override the sound, the events,
          and the style.
        </p>
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {ALERTS.map(([title, body]) => (
            <li
              key={title}
              className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
            >
              <h3 className="font-medium text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-body">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <article className="rounded-md border border-hairline bg-card p-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">Prompt queue</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Keep working</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-body">
            <li>An ordered list of prompts for a project or session.</li>
            <li>When a step ends, the next prompt is sent automatically.</li>
            <li>Mark a step “ask me first.” The queue stops and notifies you.</li>
            <li>
              Every queue has a maximum number of steps, a maximum run time, and an off switch that
              stays visible.
            </li>
            <li>
              Planned: run the next step only if a check passes, reusable templates, and a pause
              when the agent hits a usage limit.
            </li>
          </ul>
        </article>
        <article className="rounded-md border border-hairline bg-card p-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">On your machine</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Dashboard, history, safety
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-body">
            <li>
              The main window lists each session: project, agent, state, time since the last
              activity, last message, and queue progress.
            </li>
            <li>
              Every event, alert, and automatic prompt is stored locally. Export or clear the log
              any time.
            </li>
            <li>Pause all queues from one button. Sensitive steps can require approval.</li>
            <li>
              Planned: approve or deny a permission request from your phone, and an optional git
              checkpoint before each queued step.
            </li>
          </ul>
        </article>
      </section>
    </PageShell>
  );
}
