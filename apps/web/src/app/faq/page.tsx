import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Short answers about Skyboy setup, agent settings, prompt queues, privacy, and the download.",
};

const FAQ = [
  {
    q: "Does Skyboy need a command line?",
    a: "No. Setup happens in the app. A small helper program is bundled so Claude Code and Codex have something to call, but you never run it yourself.",
  },
  {
    q: "Can it break my agent settings?",
    a: "Skyboy backs up the config before changing it and can restore that backup from the app.",
  },
  {
    q: "Will it keep sending prompts forever?",
    a: "No. Every queue has a step limit and a time limit, and a stop button stays visible.",
  },
  {
    q: "Is my code sent anywhere?",
    a: "Not by default. Only phone push messages leave your computer, and only if you enable them. You can limit those messages to “Task finished,” with no code and no prompt.",
  },
  {
    q: "Is there a download yet?",
    a: "Not yet. The download button says Coming soon and opens the waitlist.",
  },
  {
    q: "Does it work with ChatGPT or Claude in the browser?",
    a: "No. Those chats have no local hooks. Skyboy covers local coding agents, starting with Claude Code and Codex.",
  },
  {
    q: "What if my computer is asleep?",
    a: "Alerts are best effort. A sleeping or offline computer cannot send one. Phone push is the option for when you are away from the desk, after you turn it on.",
  },
];

export default function FaqPage() {
  return (
    <PageShell current="/faq">
      <PageHeader
        eyebrow="FAQ"
        title="Short answers."
        lede="The desktop app is still being built. These answers describe how it is designed to work."
      />
      <div className="mt-10 max-w-3xl divide-y divide-hairline border-y border-hairline">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="cursor-pointer list-none text-lg font-semibold tracking-tight text-ink [&::-webkit-details-marker]:hidden">
              <span className="mr-3 font-mono text-xs text-pen group-open:hidden">+</span>
              <span className="mr-3 hidden font-mono text-xs text-pen group-open:inline">–</span>
              {item.q}
            </summary>
            <p className="mt-3 max-w-[62ch] pl-6 text-sm leading-relaxed text-body">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-sm text-body">
        Something else?{" "}
        <Link
          href="/contact"
          className="text-pen underline decoration-hairline underline-offset-2 hover:decoration-pen"
        >
          Write to contact@skyboy.in
        </Link>
        .
      </p>
    </PageShell>
  );
}
