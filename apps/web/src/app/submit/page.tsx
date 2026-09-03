import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Submit a skill · skyboy.in",
  description:
    "Contribute a skill to the skyboy.in curated directory. What the PR needs, how CI validates it, and how a maintainer assigns a badge.",
};

export default function SubmitPage() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/submit" />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
          Contributing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Submit a skill
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-body">
          The catalog is curated, not scraped. Work lands as a folder in this
          repo, and CI checks it before a maintainer assigns a badge.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              What a PR needs
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-body">
              <li>
                A folder at <code className="text-ink">skills/&lt;category&gt;/&lt;slug&gt;/</code>.
              </li>
              <li>
                <code className="text-ink">SKILL.md</code> with a name and
                description (the field an agent scans first).
              </li>
              <li>
                <code className="text-ink">metadata.json</code> for category,
                tags, compatible agents, license, and author. Leave the
                <code className="text-ink"> permissions </code>block alone: CI
                regenerates it.
              </li>
              <li>
                Optional <code className="text-ink">scripts/</code>,{" "}
                <code className="text-ink">references/</code>,{" "}
                <code className="text-ink">assets/</code>.
              </li>
              <li>A PR description naming 2-3 concrete use cases and the agents you tested it on.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              What CI checks
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-body">
              <li>
                <code className="text-ink">validate-skill.ts</code> frontmatter
                fields, folder size, and license.
              </li>
              <li>
                <code className="text-ink">generate-manifest.ts</code> rebuilds
                the permissions block so disclosure is always current.
              </li>
              <li>
                <code className="text-ink">detect-duplicates.ts</code> flags near
                matches. It is a note, not a gate: a fork stays as a real
                alternative, or gets <code className="text-ink">canonical_of</code>{" "}
                pointing at the entry it duplicates.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="https://github.com/aijadugar/skyboy/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm border border-hairline bg-card p-6 transition-colors hover:border-pen"
          >
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
              Start a contribution
            </p>
            <p className="mt-2 text-sm text-body">
              Read the workflow on GitHub, then open a PR with your skill
              folder.
            </p>
          </a>
          <a
            href="https://github.com/aijadugar/skyboy/blob/main/docs/skill-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm border border-hairline bg-card p-6 transition-colors hover:border-pen"
          >
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
              Skill spec
            </p>
            <p className="mt-2 text-sm text-body">
              The canonical package layout and the metadata.json schema you
              must follow.
            </p>
          </a>
        </div>

        <div className="mt-10 rounded-sm border border-hairline bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Validate locally first
          </h2>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-body">
            Run the same checks CI runs, before you push. These live at the repo
            root and read your submitted skill.
          </p>
          <div className="mt-5 overflow-x-auto">
            <pre className="md-code">
              <code className="hljs language-bash">{`npm run validate-skills
node --experimental-strip-types scripts/generate-manifest.ts
node --experimental-strip-types scripts/detect-duplicates.ts --candidate=skills/<category>/<slug>`}</code>
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
