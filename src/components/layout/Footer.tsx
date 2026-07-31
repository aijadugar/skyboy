import { footerLinks } from "@/lib/constants";
import { siteCopy } from "@/content/copy";

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.08] py-8">
      <div className="skyboy-container grid gap-5 text-sm text-[#8A8A85] md:grid-cols-[1fr_auto_1fr] md:items-center">
        <a href="/" className="flex items-center gap-2 font-semibold text-[#111110]">
          <span>{siteCopy.name}</span>
        </a>

        <nav aria-label="Footer links" className="flex flex-wrap gap-x-5 gap-y-2 md:justify-center">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#111110]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-[#8A8A85] md:text-right">
          &copy; {new Date().getFullYear()} {siteCopy.name}
        </p>
      </div>
    </footer>
  );
}
