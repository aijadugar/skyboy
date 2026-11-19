import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How Skyboy will set up Claude Code and Codex, how phone push works, and what to check when an alert does not arrive.",
};

export default function DocsPage() {
  return (
    <PageShell current="/docs">
      <PageHeader
        eyebrow="Docs"
        title="Setup lives in the app."
        lede="You will not edit a settings file or run a command. These notes describe what the desktop app does on first launch. The app is not available yet."
      />

      <p className="mt-6 max-w-[62ch] rounded-md border border-hairline bg-card px-4 py-3 text-sm leading-relaxed text-body">
        Until there is an installer, use the{" "}
        <Link
          href="/download#waitlist"
          className="text-pen underline decoration-hairline underline-offset-2 hover:decoration-pen"
        >
          waitlist
        </Link>
        . Hook names below follow the current product plan and must be checked against Claude Code
        and Codex before the app is built.
      </p>

      <section className="mt-12 max-w-3xl" id="first-run">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">First run</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-body">
          <li>Download Skyboy and open it.</li>
          <li>Click Enable Claude Code, Enable Codex, or both.</li>
          <li>Pick an alert style and preview a sound.</li>
          <li>Run a task. Skyboy alerts you when the agent finishes or needs you.</li>
        </ol>
      </section>

      <section className="mt-12 max-w-3xl" id="claude-code">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Claude Code</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Claude Code can run a hook when it needs attention and when a response finishes. Enable
          Claude Code writes those hooks into the agent settings. Skyboy copies the config to a
          backup first. The hook calls a small helper that ships inside the app. The helper forwards
          the event to the running Skyboy over a local connection. You never run that helper
          yourself.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Uninstall removes the entries Skyboy added. If something looks wrong, restore the backup
          from the app.
        </p>
      </section>

      <section className="mt-12 max-w-3xl" id="codex">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Codex</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Codex exposes a notify setting, plus events for a permission request and a completed turn.
          Enable Codex turns those on with the same backup and the same local helper. Skyboy shows,
          in the session details, whether the next prompt continues the same conversation or resumes
          a saved session.
        </p>
      </section>

      <section className="mt-12 max-w-3xl" id="phone-push">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Phone push</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Phone push is off by default. Nothing about your prompts or code leaves the computer until
          you enable it, and the app shows the exact text it will send. You can limit that text to
          “Task finished,” with no code and no prompt.
        </p>
        <div className="mt-5 space-y-4">
          <div className="border-t border-hairline pt-4">
            <h3 className="font-semibold text-ink">ntfy</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">
              The first version posts to a topic. Skyboy generates a long random topic name. Install
              the free ntfy app, subscribe to that topic, and the phone shows the alert. There is a
              field for a self-hosted ntfy server if you run your own.
            </p>
          </div>
          <div className="border-t border-hairline pt-4">
            <h3 className="font-semibold text-ink">Skyboy mobile app</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Planned. A companion app would add push, a reply with the next prompt, and approve or
              deny from the phone. That needs a relay run by Skyboy, with its own privacy rules. It
              is not part of the first versions.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 max-w-3xl" id="troubleshooting">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Troubleshooting</h2>
        <ul className="mt-4 space-y-4 text-sm leading-relaxed text-body">
          <li>
            <span className="font-medium text-ink">No sound.</span> Use the test button in the app.
            Check the volume, the sound assigned to that event, and whether quiet hours are muting
            it.
          </li>
          <li>
            <span className="font-medium text-ink">The queue did not continue.</span> Confirm a
            queue is on, the step is not marked “ask me first,” and the step or time limit has not
            been reached. Pause all queues stops every project.
          </li>
          <li>
            <span className="font-medium text-ink">Agent settings changed.</span> Restore the backup
            Skyboy made before it wrote the hooks.
          </li>
          <li>
            <span className="font-medium text-ink">Nothing while you were away from the desk.</span>{" "}
            Alerts need the computer awake. Phone push is the path for when you leave, and only
            after you enable it.
          </li>
          <li>
            <span className="font-medium text-ink">ChatGPT or Claude in the browser.</span> Those
            sessions have no local hooks. Skyboy covers Claude Code and Codex on your machine.
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
