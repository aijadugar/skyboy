"use client";

import { useMemo, useState } from "react";
import {
  AGENT_OPTIONS,
  Field,
  FormStatus,
  OS_OPTIONS,
  PrivacyNote,
  fieldClass,
  useMailtoForm,
} from "./forms";

export function WaitlistForm({
  os,
  onOsChange,
  cpu,
}: {
  os?: string;
  onOsChange?: (os: string) => void;
  cpu?: string;
}) {
  const [localOs, setLocalOs] = useState("Windows");
  const [agents, setAgents] = useState<string[]>(["Claude Code"]);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const { sent, draft, send } = useMailtoForm();

  const selectedOs = os ?? localOs;
  const setOs = onOsChange ?? setLocalOs;

  const body = useMemo(() => {
    const lines = [
      `Email: ${email}`,
      `Operating system: ${selectedOs}`,
      cpu ? `CPU: ${cpu}` : null,
      `Agents: ${agents.join(", ") || "none selected"}`,
      note.trim() ? `Note: ${note.trim()}` : null,
    ];
    return lines.filter(Boolean).join("\n");
  }, [agents, cpu, email, note, selectedOs]);

  function toggleAgent(agent: string) {
    setAgents((current) =>
      current.includes(agent) ? current.filter((item) => item !== agent) : [...current, agent],
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        if (agents.length === 0) {
          event.preventDefault();
          return;
        }
        send(event, "Skyboy waitlist", body);
      }}
    >
      <Field
        label="Email"
        why="So we can tell you when an installer exists for your system. We use it for that note only."
      >
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
          placeholder="you@example.com"
        />
      </Field>

      {os === undefined ? (
        <Field
          label="Operating system"
          why="The first installers are Windows and macOS. Linux follows. This picks which note you receive."
        >
          <select
            name="os"
            value={selectedOs}
            onChange={(event) => setOs(event.target.value)}
            className={fieldClass}
          >
            {OS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <fieldset>
        <legend className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
          Agents you use
        </legend>
        <p className="mt-1 text-sm leading-relaxed text-body">
          Skyboy starts with Claude Code and Codex. Other tells us who to support next.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AGENT_OPTIONS.map((agent) => {
            const checked = agents.includes(agent);
            return (
              <label
                key={agent}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-pill border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] ${
                  checked ? "border-pen bg-[#eceafc] text-pen" : "border-hairline bg-card text-body"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-[#2724d1]"
                  checked={checked}
                  onChange={() => toggleAgent(agent)}
                />
                {agent}
              </label>
            );
          })}
        </div>
        {agents.length === 0 ? (
          <p className="mt-2 text-sm text-error">Choose at least one agent.</p>
        ) : null}
      </fieldset>

      <Field
        label="Note"
        why="Optional. A project, a constraint, or the alert you actually want. Leave it blank if you only want the release note."
      >
        <textarea
          name="note"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </Field>

      <PrivacyNote />
      <FormStatus sent={sent} subject={draft.subject} body={draft.body} />

      <button
        type="submit"
        className="rounded-sm bg-pen px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-white transition-colors hover:bg-pen-deep"
      >
        Join the waitlist
      </button>
    </form>
  );
}
