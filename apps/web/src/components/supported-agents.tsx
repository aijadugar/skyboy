import { SUPPORTED_AGENTS } from "@/lib/catalog";

export function SupportedAgents() {
  // One marquee (taste-skill §5: max one, no second scrolling strip). The set
  // is duplicated inline so translateX(-50%) loops seamlessly; each chip's
  // margin-right rides inside the set width.
  return (
    <section className="border-y border-hairline bg-card py-6">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-mute">
          Works where you already are
        </p>
        <div className="sk-marquee">
          <div className="sk-marquee__track">
            {[0, 1].map((dup) => (
              <div key={dup} className="sk-marquee__set" aria-hidden={dup === 1}>
                {SUPPORTED_AGENTS.map((agent) => (
                  <span key={`${dup}-${agent.name}`} className="sk-chip">
                    <span className="sk-chip__dot" />
                    {agent.name}
                    <span className="text-mute">{agent.note}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
