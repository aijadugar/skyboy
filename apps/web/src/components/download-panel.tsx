"use client";

import { useState } from "react";
import { ComingSoonButton } from "./coming-soon-button";
import { OS_OPTIONS, fieldClass } from "./forms";
import { WaitlistForm } from "./waitlist-form";

const PLATFORMS = [
  { name: "Windows 10/11", plan: "First release" },
  { name: "macOS", plan: "First release" },
  { name: "Linux", plan: "After the first release" },
];

export function DownloadPanel() {
  const [os, setOs] = useState("Windows");
  const [cpu, setCpu] = useState("Apple silicon");
  const needsCpu = os === "macOS";

  return (
    <>
      <section className="mt-10 rounded-md border border-hairline bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">Current release</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">Coming soon</p>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-mute">Version</dt>
                <dd className="mt-1 text-ink">Not published</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-mute">Date</dt>
                <dd className="mt-1 text-ink">Not published</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-mute">Checksum</dt>
                <dd className="mt-1 text-ink">Ships with the file</dd>
              </div>
            </dl>
          </div>
          <ComingSoonButton />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 border-t border-hairline pt-6 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink">Operating system</span>
            <span className="mt-1 block text-sm leading-relaxed text-body">
              After release, this chooses the matching installer. The other systems stay listed below. Today it only fills the waitlist.
            </span>
            <select className={`${fieldClass} mt-2`} value={os} onChange={(event) => setOs(event.target.value)}>
              {OS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {needsCpu ? (
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink">CPU</span>
              <span className="mt-1 block text-sm leading-relaxed text-body">
                macOS needs a separate build for Intel and Apple silicon. We record which one you need.
              </span>
              <select className={`${fieldClass} mt-2`} value={cpu} onChange={(event) => setCpu(event.target.value)}>
                <option>Apple silicon</option>
                <option>Intel</option>
              </select>
            </label>
          ) : (
            <p className="self-end text-sm leading-relaxed text-body">
              Windows and Linux builds are one file per system. A CPU choice appears for macOS.
            </p>
          )}
        </div>
      </section>

      <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
        {PLATFORMS.map((platform) => (
          <li key={platform.name} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="font-medium text-ink">{platform.name}</span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-mute">{platform.plan}</span>
          </li>
        ))}
      </ul>

      <section id="waitlist" className="mt-14 max-w-xl scroll-mt-24">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Waitlist</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Tell us where to send the release note. The operating system
          {needsCpu ? " and CPU" : ""} above are included in the message.
        </p>
        <div className="mt-6">
          <WaitlistForm os={os} onOsChange={setOs} cpu={needsCpu ? cpu : undefined} />
        </div>
      </section>
    </>
  );
}
