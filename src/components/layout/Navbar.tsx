"use client";

import { Menu } from "lucide-react";
import { navLinks } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-skyboy-background/80 backdrop-blur">
      <div className="skyboy-container flex h-16 items-center justify-between">
        <a href="/" className="font-semibold text-skyboy-text">
          Skyboy.in
        </a>
        <div className="hidden items-center gap-6 text-sm text-skyboy-text-secondary md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Navigation</SheetTitle>
            <div className="mt-8 grid gap-4">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
