import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";

export type TerminalLine =
  | string
  | {
      text: string;
      tone?: "default" | "muted" | "success" | "warning";
    };

export interface TerminalWindowProps {
  title?: string;
  lines?: TerminalLine[];
  className?: string;
}

const toneClassNames: Record<NonNullable<Exclude<TerminalLine, string>["tone"]>, string> = {
  default: "text-skyboy-text-secondary",
  muted: "text-skyboy-text-muted",
  success: "text-skyboy-success",
  warning: "text-skyboy-warning",
};

// This is a React island because terminal lines reveal progressively when they enter the viewport.
export default function TerminalWindow({ title = "", lines = [], className = "" }: TerminalWindowProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const normalizedLines = useMemo(
    () => lines.map((line) => (typeof line === "string" ? { text: line, tone: "default" as const } : line)),
    [lines],
  );

  return (
    <div
      ref={ref}
      className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-skyboy-surface/95 font-mono text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur ${className}`}
    >
      <div className="flex min-h-11 items-center gap-3 border-b border-white/[0.08] px-4">
        <div className="flex gap-2" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#F87171]" />
          <span className="size-3 rounded-full bg-[#FBBF24]" />
          <span className="size-3 rounded-full bg-[#34D399]" />
        </div>
        {title ? <div className="truncate text-xs text-skyboy-text-muted">{title}</div> : null}
      </div>
      <div className="grid gap-2 p-4">
        {normalizedLines.map((line, lineIndex) => (
          <p key={`${line.text}-${lineIndex}`} className={toneClassNames[line.tone ?? "default"]}>
            {line.text.split("").map((char, charIndex) => (
              <motion.span
                key={`${lineIndex}-${charIndex}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={reduceMotion || isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: lineIndex * 0.14 + charIndex * 0.04, duration: 0.01 }}
              >
                {char}
              </motion.span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
