import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Skyboy hears Claude Code and Codex, chooses an alert, and sends the next prompt from your queue.",
};

const FLOW = [
  { title: "Event", body: "Claude Code or Codex finishes, asks for permission, or asks a question." },
  { title: "Listener", body: "A bundled helper receives the hook and forwards it to Skyboy on your computer." },
  { title: "Rules", body: "Skyboy picks the alert and, if a queue is active, the next step." },
  { title: "Action", body: "Sound, ring, banner, or phone push. The queue runner may send the next prompt. The history log records it." },
];

export default function HowItWorksPage() {
  return (
    <PageShell current="/how-it-works">
      <PageHeader
        eyebrow="How it works"
        title="The agent signals. Skyboy decides what you hear."
        lede="Both Claude Code and Codex can run a command when something happens. Skyboy sets that up for you. You never edit a config file."
      />

      <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-4">
        {FLOW.map((step, index) => (
          <li key={step.title} className="rounded-md border border-hairline bg-card p-5">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">0{index + 1}</p>
            <h2 className="mt-3 text-lg font-semibold text-ink">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-14" aria-labelledby="flow-diagram">
        <h2 id="flow-diagram" className="text-2xl font-semibold tracking-tight text-ink">
          What happens on your computer
        </h2>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-body">
          The agent never talks to a Skyboy server. The hook stays on the machine,
          and Skyboy decides the alert, the next queue step, and the log entry.
        </p>
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline bg-card p-5 sm:p-8">
          <div className="flex min-w-[40rem] items-stretch gap-4">
            <div className="flex w-52 flex-col justify-center rounded-md border border-hairline bg-paper p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-mute">Claude Code / Codex</p>
              <p className="mt-2 text-sm font-semibold text-ink">Event fires</p>
              <p className="mt-1 text-sm leading-relaxed text-body">Done, needs permission, or needs input.</p>
            </div>
            <div className="flex items-center font-mono text-pen" aria-hidden="true">→</div>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="rounded-md border border-pen bg-[#eceafc] px-4 py-3">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-pen">Skyboy</p>
                <p className="mt-1 text-sm font-semibold text-ink">Event listener, then the rules engine</p>
                <p className="mt-1 text-sm leading-relaxed text-body">Which alert, and which queue step, if any.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-hairline bg-paper p-4">
                  <p className="text-sm font-semibold text-ink">Alert layer</p>
                  <p className="mt-1 text-sm leading-relaxed text-body">Sound, ring, desktop banner, or phone push.</p>
                </div>
                <div className="rounded-md border border-hairline bg-paper p-4">
                  <p className="text-sm font-semibold text-ink">Queue runner</p>
                  <p className="mt-1 text-sm leading-relaxed text-body">Sends the next prompt you wrote.</p>
                </div>
                <div className="rounded-md border border-hairline bg-paper p-4">
                  <p className="text-sm font-semibold text-ink">History log</p>
                  <p className="mt-1 text-sm leading-relaxed text-body">Records the event, the alert, and the prompt.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">First launch</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          This ships with the desktop app. Until the app exists, join the{" "}
          <Link href="/download#waitlist" className="text-pen underline decoration-hairline underline-offset-2 hover:decoration-pen">
            waitlist
          </Link>
          .
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-body">
          <li>Download Skyboy from this website and open it.</li>
          <li>Click Enable Claude Code, Enable Codex, or both.</li>
          <li>Choose an alert style and a sound. Preview it first.</li>
          <li>Run a task in the agent and wait for the alert.</li>
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-body">
          Skyboy backs up the agent config before it changes anything, and removes
          its own entries on uninstall. You can restore the backup from the app.
        </p>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-md border border-hairline bg-card p-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Claude Code</h2>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Claude Code has hook events for needing attention and for finishing a
            response. Enable Claude Code writes those hooks into its settings.
            The hook calls the helper bundled with Skyboy, which forwards the
            event over a local connection.
          </p>
        </article>
        <article className="rounded-md border border-hairline bg-card p-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Codex</h2>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Codex has a notify setting, plus permission-request and turn-complete
            events. Enable Codex turns those on the same way: a backup first, then
            a hook that talks only to the Skyboy app already running on your machine.
          </p>
        </article>
      </section>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Sending the next prompt</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Skyboy uses whichever method that agent supports, and shows the method
          in the session details. Both have to be checked against the agent’s
          current behavior before the app ships.
        </p>
        <div className="mt-5 space-y-4">
          <div className="border-t border-hairline pt-4">
            <h3 className="font-semibold text-ink">Same session</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">
              The finish hook asks Skyboy what to do. Skyboy answers with the next
              prompt, and the agent continues in the same conversation. This is
              the preferred path when the agent supports it.
            </p>
          </div>
          <div className="border-t border-hairline pt-4">
            <h3 className="font-semibold text-ink">Resume</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Skyboy starts the agent in non-interactive mode against the saved
              session and passes the next prompt. This is more robust, and less live.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">What it will not cover</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-body">
          <li>Browser chats such as ChatGPT and Claude on the web have no hooks. Skyboy is for local coding agents.</li>
          <li>If Claude Code or Codex changes its hooks, Skyboy has to be updated.</li>
          <li>If the computer is asleep or offline, no alert can be sent.</li>
        </ul>
      </section>
    </PageShell>
  );
}
