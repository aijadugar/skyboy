import { useState } from "react";
import { Check } from "lucide-react";

type Tier = {
  name: string;
  price: string;
  annualPrice?: string;
  summary: string;
  features: string[];
  cta: string;
  popular?: boolean;
  variant?: "outline" | "gradient" | "enterprise";
};

const tiers: Tier[] = [
  {
    name: "Community",
    price: "$0",
    summary: "For public projects and individual exploration",
    features: ["Public projects only", "Public leaderboards", "Limited compute", "Community support"],
    cta: "Get Started",
    variant: "outline",
  },
  {
    name: "Pro",
    // TODO: Replace placeholder pricing before launch.
    price: "$[TBD]",
    annualPrice: "$[TBD]",
    summary: "For individual developers going private",
    features: ["Private repositories", "Unlimited experiments", "Advanced analytics", "Email support"],
    cta: "Start Free Trial",
    variant: "outline",
  },
  {
    name: "Team",
    // TODO: Replace placeholder pricing before launch.
    price: "$[TBD]",
    annualPrice: "$[TBD]",
    summary: "For teams building together",
    features: ["Everything in Pro", "Shared workspaces", "RBAC", "Private datasets", "CI integration", "API access"],
    cta: "Start Free Trial",
    popular: true,
    variant: "gradient",
  },
  {
    name: "Enterprise",
    price: "Custom",
    summary: "For organizations with security and scale needs",
    features: [
      "Everything in Team",
      "On-prem deployment",
      "VPC support",
      "SSO",
      "Compliance & audit logs",
      "Custom benchmark suites",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    variant: "enterprise",
  },
];

function displayPrice(tier: Tier, annual: boolean) {
  const price = annual && tier.annualPrice ? tier.annualPrice : tier.price;
  return price === "$[TBD]" ? "Contact us for pricing" : price;
}

function PricingCard({ tier, annual }: { tier: Tier; annual: boolean }) {
  const isPlaceholder = displayPrice(tier, annual) === "Contact us for pricing";

  return (
    <article
      className={`group relative flex min-h-[34rem] flex-col rounded-2xl border bg-white/[0.03] p-6 backdrop-blur transition duration-200 hover:-translate-y-1 ${
        tier.popular
          ? "border-skyboy-blue/35 shadow-[0_24px_80px_rgba(59,130,246,0.16)]"
          : "border-white/[0.08] hover:border-white/[0.16]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-0 blur-2xl transition-opacity duration-200 group-hover:opacity-60 ${
          tier.popular ? "opacity-40" : ""
        }`}
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.22), rgba(139, 92, 246, 0.12) 42%, transparent 72%)",
        }}
      />
      {tier.popular && (
        <div className="mb-5 w-fit rounded-full bg-gradient-accent px-3 py-1 text-xs font-medium text-skyboy-text">
          Most Popular
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-skyboy-text">{tier.name}</h3>
        <p className="mt-3 min-h-12 text-sm leading-6 text-skyboy-text-secondary">{tier.summary}</p>
      </div>

      <div className="mt-7">
        <p className={isPlaceholder ? "text-2xl font-semibold text-skyboy-text" : "font-mono text-4xl text-skyboy-text"}>
          {displayPrice(tier, annual)}
        </p>
        {!isPlaceholder && tier.price !== "Custom" && tier.price !== "$0" && (
          <p className="mt-2 text-sm text-skyboy-text-muted">per month</p>
        )}
        {isPlaceholder && <p className="mt-2 text-sm text-skyboy-text-muted">Placeholder until launch pricing is finalized</p>}
      </div>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-skyboy-text-secondary">
            <Check className="mt-0.5 size-4 shrink-0 text-skyboy-success" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`mt-8 inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${
          tier.variant === "gradient"
            ? "bg-gradient-accent text-skyboy-text shadow-[0_0_30px_rgba(59,130,246,0.22)] hover:scale-[1.01]"
            : tier.variant === "enterprise"
              ? "border border-white/[0.12] bg-skyboy-text text-skyboy-background hover:bg-skyboy-text/90"
              : "border border-white/[0.08] bg-white/[0.03] text-skyboy-text hover:border-white/[0.16] hover:bg-white/[0.06]"
        }`}
      >
        {tier.cta}
      </button>
    </article>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="skyboy-section">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-skyboy-success">Pricing</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-skyboy-text md:text-5xl">
            Start free. Scale when you need to.
          </h2>

          <div className="mt-8 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                !annual ? "bg-skyboy-text text-skyboy-background" : "text-skyboy-text-secondary hover:text-skyboy-text"
              }`}
              aria-pressed={!annual}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                annual ? "bg-skyboy-text text-skyboy-background" : "text-skyboy-text-secondary hover:text-skyboy-text"
              }`}
              aria-pressed={annual}
            >
              Annual
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  annual ? "bg-skyboy-background/15 text-skyboy-background" : "bg-skyboy-success/10 text-skyboy-success"
                }`}
              >
                Save ~20%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} annual={annual} />
          ))}
        </div>
      </div>
    </section>
  );
}
