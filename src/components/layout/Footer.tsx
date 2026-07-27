import { GitBranch, MessageCircle, Send } from "lucide-react";
import { footerLinks, socialLinks } from "@/lib/constants";
import { siteCopy } from "@/content/copy";

const socialIcons = {
  GitHub: GitBranch,
  X: Send,
  Discord: MessageCircle,
} as const;

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] py-8">
      <div className="skyboy-container grid gap-5 text-sm text-skyboy-text-secondary md:grid-cols-[1fr_auto_1fr] md:items-center">
        <a href="/" className="font-semibold text-skyboy-text">
          {siteCopy.name}
        </a>

        <nav aria-label="Footer links" className="flex flex-wrap gap-x-5 gap-y-2 md:justify-center">
          {footerLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-4 md:items-end">
          <nav aria-label="Social links" className="flex gap-3">
            {socialLinks.map((link) => {
              const Icon = socialIcons[link.label];

              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-skyboy-text-secondary transition hover:border-white/[0.16] hover:text-skyboy-text"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              );
            })}
          </nav>
          <p className="text-xs text-skyboy-text-muted">
            (c) {new Date().getFullYear()} {siteCopy.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
