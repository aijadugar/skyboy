"use client";

import { useRef, useState } from "react";

type Tone = {
  id: string;
  name: string;
  event: string;
  blurb: string;
  play: (ctx: AudioContext) => void;
};

const TONES: Tone[] = [
  {
    id: "chime",
    name: "Paper chime",
    event: "Task finished",
    blurb: "Two soft notes. The default for a turn that completed.",
    play: (ctx) => {
      note(ctx, 523.25, 0, 0.45);
      note(ctx, 659.25, 0.16, 0.6);
    },
  },
  {
    id: "bell",
    name: "Desk bell",
    event: "Needs input",
    blurb: "A brighter pair of notes when the agent asked you a question.",
    play: (ctx) => {
      note(ctx, 880, 0, 0.28, "triangle", 0.12);
      note(ctx, 1174.66, 0.12, 0.4, "triangle", 0.1);
    },
  },
  {
    id: "knock",
    name: "Two knocks",
    event: "Needs permission",
    blurb: "Short and dry, for an approval that is blocking the agent.",
    play: (ctx) => {
      note(ctx, 180, 0, 0.09, "square", 0.06);
      note(ctx, 140, 0.18, 0.1, "square", 0.06);
    },
  },
  {
    id: "low",
    name: "Low tone",
    event: "Error or stuck",
    blurb: "A falling tone for a failure. Stuck detection itself is planned.",
    play: (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    },
  },
  {
    id: "pulse",
    name: "Steady pulse",
    event: "Ring",
    blurb: "Three pulses here. In the app the ring continues until you dismiss it, within the duration you set.",
    play: (ctx) => {
      note(ctx, 740, 0, 0.12, "sine", 0.1);
      note(ctx, 740, 0.45, 0.12, "sine", 0.1);
      note(ctx, 740, 0.9, 0.12, "sine", 0.1);
    },
  },
];

export function SoundGallery() {
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  async function preview(tone: Tone) {
    setError(null);
    const AudioCtx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      setError("This browser cannot play the preview.");
      return;
    }
    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    setActive(tone.id);
    tone.play(ctx);
    window.setTimeout(() => setActive((current) => (current === tone.id ? null : current)), 1400);
  }

  return (
    <div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {TONES.map((tone) => {
          const playing = active === tone.id;
          return (
            <li key={tone.id} className="rounded-md border border-hairline bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-pen">{tone.event}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{tone.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => preview(tone)}
                  aria-pressed={playing}
                  className="rounded-sm border border-hairline bg-paper px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:border-pen hover:text-pen"
                >
                  {playing ? "Playing" : "Preview"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-body">{tone.blurb}</p>
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
      <p className="mt-6 max-w-[62ch] text-sm leading-relaxed text-body">
        These are the preview tones for the built-in set. In the app you can
        change the volume, assign a different sound to each agent and event, or
        import your own audio file. Phone push and desktop banners are separate
        from these sounds.
      </p>
    </div>
  );
}

function note(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  level = 0.14,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}
