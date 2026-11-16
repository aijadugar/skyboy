import Link from "next/link";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">This page is not part of Skyboy.</h1>
        <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-body">
          skyboy.in is the desktop notifier for Claude Code and Codex. The old
          skills directory is gone.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
        >
          Back home →
        </Link>
      </main>
      <Footer />
    </div>
  );
}
