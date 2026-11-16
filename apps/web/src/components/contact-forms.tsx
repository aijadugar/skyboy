"use client";

import { useState } from "react";
import {
  AGENT_OPTIONS,
  Field,
  FormStatus,
  PrivacyNote,
  fieldClass,
  useMailtoForm,
} from "./forms";

const SUBJECTS = [
  { value: "support", label: "Support" },
  { value: "feedback", label: "Feedback" },
  { value: "partnership", label: "Partnership" },
] as const;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]["value"]>("support");
  const [message, setMessage] = useState("");
  const { sent, draft, send } = useMailtoForm();
  const subjectLabel = SUBJECTS.find((item) => item.value === subject)?.label ?? "Support";
  const body = `Name: ${name}\nEmail: ${email}\nSubject: ${subjectLabel}\n\n${message}`;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => send(event, `Skyboy ${subjectLabel.toLowerCase()} from ${name}`, body)}
    >
      <Field label="Name" why="So the reply is addressed to you.">
        <input required name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="Email" why="So we can write back. It is not added to the waitlist unless you ask.">
        <input required type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="Subject" why="Support, feedback, and partnership go to the same inbox. The subject tells us which to read first.">
        <select name="subject" value={subject} onChange={(event) => setSubject(event.target.value as typeof subject)} className={fieldClass}>
          {SUBJECTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Message" why="The question or note itself. Include the agent and operating system if you are reporting a problem.">
        <textarea required name="message" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} className={fieldClass} />
      </Field>
      <PrivacyNote />
      <FormStatus sent={sent} subject={draft.subject} body={draft.body} />
      <button type="submit" className="rounded-sm bg-pen px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-white transition-colors hover:bg-pen-deep">
        Send message
      </button>
    </form>
  );
}

export function FeatureRequestForm() {
  const [email, setEmail] = useState("");
  const [agent, setAgent] = useState<string>(AGENT_OPTIONS[0]);
  const [want, setWant] = useState("");
  const { sent, draft, send } = useMailtoForm();
  const body = [`Email: ${email.trim() || "not provided"}`, `Agent: ${agent}`, "", want].join("\n");

  return (
    <form className="space-y-6" onSubmit={(event) => send(event, `Skyboy feature request (${agent})`, body)}>
      <Field label="Email" why="Optional. Include it if you want to hear when the idea lands. Leave it blank to send the request without a reply address.">
        <input type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="you@example.com" />
      </Field>
      <Field label="Which agent" why="Requests are grouped by Claude Code, Codex, or another agent so the queue matches how you work.">
        <select name="agent" value={agent} onChange={(event) => setAgent(event.target.value)} className={fieldClass}>
          {AGENT_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Field>
      <Field label="What you want the app to do" why="A concrete alert, queue step, or control. This is the request.">
        <textarea required name="want" rows={5} value={want} onChange={(event) => setWant(event.target.value)} className={fieldClass} />
      </Field>
      <PrivacyNote />
      <FormStatus sent={sent} subject={draft.subject} body={draft.body} />
      <button type="submit" className="rounded-sm border border-pen bg-card px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-pen transition-colors hover:bg-[#eceafc]">
        Send feature request
      </button>
    </form>
  );
}
