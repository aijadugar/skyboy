import { footerLinks } from "@/lib/constants";
import { siteCopy } from "@/content/copy";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--skyboy-border)] py-8">
      <div className="skyboy-container grid gap-5 text-sm text-[var(--skyboy-text-secondary)] md:grid-cols-[1fr_auto_1fr] md:items-center">
        <a href="/" className="flex items-center gap-2 font-semibold text-[var(--skyboy-text)]">
          <span>{siteCopy.name}</span>
        </a>

        <nav aria-label="Footer links" className="flex flex-wrap gap-x-5 gap-y-2 md:justify-center">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--skyboy-text)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-[var(--skyboy-text-muted)] md:text-right">
          &copy; {new Date().getFullYear()} {siteCopy.name}
        </p>
      </div>
    </footer>
  );
}
