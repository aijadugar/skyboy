"use client";

import { useEffect, useState } from "react";
import { DrawablyCard } from "drawably/react";

const FRAMES = [
  {
    agent: "Claude Code",
    project: "my-app",
    state: "Running",
    age: "12s",
    message: "Updating the session list and the alert rules.",
    queue: "Step 2 of 7",
    alert: "Listening",
  },
  {
    agent: "Claude Code",
    project: "my-app",
    state: "Needs permission",
    age: "0s",
    message: "May I run the test command?",
    queue: "Paused for you",
    alert: "Ring until you dismiss it",
  },
  {
    agent: "Codex",
    project: "billing-api",
    state: "Finished",
    age: "just now",
    message: "Queue step done. Sending the next prompt you wrote.",
    queue: "Step 4 of 7",
    alert: "Soft chime",
  },
];

export function SessionDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % FRAMES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  const frame = FRAMES[index];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">A short look at the app</p>
        <div className="flex gap-1" aria-hidden="true">
          {FRAMES.map((item, itemIndex) => (
            <span
              key={item.state}
              className={`h-1.5 w-6 rounded-pill ${itemIndex === index ? "bg-pen" : "bg-hairline"}`}
            />
          ))}
        </div>
      </div>
      <DrawablyCard seed={7} className="sk-card--bare p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-mute">{frame.agent}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{frame.project}</h2>
          </div>
          <span className="sk-badge sk-badge-official">{frame.state}</span>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-5">
          <div>
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-mute">Last activity</dt>
            <dd className="mt-1 text-sm text-ink">{frame.age}</dd>
          </div>
          <div>
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-mute">Queue</dt>
            <dd className="mt-1 text-sm text-ink">{frame.queue}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-body">{frame.message}</p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-pen">{frame.alert}</p>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">Pause all queues</span>
        </div>
      </DrawablyCard>
      <div className="mt-3 flex gap-2">
        {FRAMES.map((item, itemIndex) => (
          <button
            key={item.state}
            type="button"
            onClick={() => setIndex(itemIndex)}
            className={`rounded-pill border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] ${
              itemIndex === index ? "border-pen text-pen" : "border-hairline text-mute"
            }`}
          >
            {item.state}
          </button>
        ))}
      </div>
    </div>
  );
}
