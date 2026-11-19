"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

export const fieldClass =
  "w-full rounded-sm border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-pen";

export function Field({
  label,
  why,
  children,
}: {
  label: string;
  why: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink">{label}</span>
      <span className="mt-1 block text-sm leading-relaxed text-body">{why}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function PrivacyNote() {
  return (
    <p className="text-sm leading-relaxed text-body">
      Submitting opens an email to contact@skyboy.in with only the fields on this form. The website
      does not store them.{" "}
      <Link
        href="/privacy"
        className="text-pen underline decoration-hairline underline-offset-2 hover:decoration-pen"
      >
        Privacy
      </Link>
    </p>
  );
}

export function FormStatus({
  sent,
  subject,
  body,
}: {
  sent: boolean;
  subject: string;
  body: string;
}) {
  if (!sent) return null;
  return (
    <div className="rounded-sm border border-hairline bg-paper px-4 py-3 text-sm leading-relaxed text-body">
      <p className="font-medium text-ink">
        Your email app should open, addressed to contact@skyboy.in.
      </p>
      <p className="mt-2">If it does not, copy this note. Subject: {subject}</p>
      <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-ink">{body}</pre>
    </div>
  );
}

export function useMailtoForm() {
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState({ subject: "", body: "" });

  function send(event: FormEvent<HTMLFormElement>, subject: string, body: string) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setDraft({ subject, body });
    setSent(true);
    window.location.href = `mailto:contact@skyboy.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return { sent, draft, send };
}

export const OS_OPTIONS = [
  { value: "Windows", label: "Windows" },
  { value: "macOS", label: "macOS" },
  { value: "Linux", label: "Linux" },
] as const;

export const AGENT_OPTIONS = ["Claude Code", "Codex", "Other"] as const;
