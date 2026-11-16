"use client";

import { DrawablyHighlight, DrawablyUnderline } from "drawably/react";

export function Headline() {
  return (
    <>
      <h1 className="mt-4 max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
        Know the moment your coding agent is{" "}
        <DrawablyUnderline className="whitespace-nowrap">done</DrawablyUnderline>.
      </h1>
      <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-body">
        Keep it working while you are away. Skyboy alerts you the way you
        choose when <DrawablyHighlight>Claude Code</DrawablyHighlight> or{" "}
        <DrawablyHighlight>Codex</DrawablyHighlight> finishes or needs you,
        then sends the next prompt from a queue you wrote.
      </p>
    </>
  );
}
