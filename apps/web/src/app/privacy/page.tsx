import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Skyboy keeps on your computer, what phone push can send, and which fields the website forms collect.",
};

export default function PrivacyPage() {
  return (
    <PageShell current="/privacy">
      <PageHeader
        eyebrow="Privacy"
        title="Local unless you send it."
        lede="Desktop alerts and queues do not need an account. The website collects only the fields on its forms, and those forms open an email instead of storing a copy here."
      />

      <div className="mt-12 max-w-3xl space-y-10 text-sm leading-relaxed text-body">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">On your computer</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>Prompts, agent output, and history are stored only on your machine.</li>
            <li>
              Skyboy does not run a queued prompt unless you created that queue, and the app shows
              when a queue is active.
            </li>
            <li>
              Step limits and time limits bound automatic prompts. You can cancel them at any
              moment.
            </li>
            <li>
              There is no telemetry in the app unless you opt in. That opt-in does not exist yet,
              because the app is not built.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Phone push</h2>
          <p className="mt-4">
            Phone push is off by default. It sends only what you enable, and the app shows that text
            before it goes out. You can limit the message to “Task finished,” with no code and no
            prompt. The first delivery path is an ntfy topic with a long random name, or a
            self-hosted ntfy server you enter. A Skyboy mobile app, which would use a relay, is
            planned and is not part of this site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">This website</h2>
          <p className="mt-4">
            The site is a marketing and download page. The app does not run here. Forms do not post
            into a database on skyboy.in. Submit opens your email app with a message to{" "}
            <a
              href="mailto:contact@skyboy.in"
              className="text-pen underline decoration-hairline underline-offset-2"
            >
              contact@skyboy.in
            </a>
            . Each form says why its fields are collected.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              <Link
                href="/download#waitlist"
                className="text-ink underline decoration-hairline underline-offset-2"
              >
                Waitlist
              </Link>
              : email, operating system, agents you use, and an optional note. macOS also asks Intel
              or Apple silicon so the later installer matches the machine.
            </li>
            <li>
              <Link
                href="/contact"
                className="text-ink underline decoration-hairline underline-offset-2"
              >
                Contact
              </Link>
              : name, email, subject (support, feedback, or partnership), and a message.
            </li>
            <li>
              <Link
                href="/contact#feature-request"
                className="text-ink underline decoration-hairline underline-offset-2"
              >
                Feature request
              </Link>
              : an optional email, which agent, and what you want the app to do.
            </li>
          </ul>
          <p className="mt-4">
            The site does not run a visitor analytics script. Pages you open are still visible to
            the host that serves skyboy.in, the same way any website request is.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Agent configuration</h2>
          <p className="mt-4">
            Enabling Claude Code or Codex changes that agent’s settings so it can notify Skyboy. The
            app backs up the file first and can restore it. Those files stay on your computer.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
