import { Footer } from "./footer";
import { SiteNav } from "./site-nav";

export function PageShell({ current, children }: { current: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav current={current} />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="max-w-[40rem]">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-body">{lede}</p>
    </header>
  );
}
