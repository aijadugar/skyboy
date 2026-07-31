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
  variant?: "outline" | "primary" | "enterprise";
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
    price: "$[TBD]",
    annualPrice: "$[TBD]",
    summary: "For individual developers going private",
    features: ["Private repositories", "Unlimited experiments", "Advanced analytics", "Email support"],
    cta: "Start Free Trial",
    variant: "outline",
  },
  {
    name: "Team",
    price: "$[TBD]",
    annualPrice: "$[TBD]",
    summary: "For teams building together",
    features: ["Everything in Pro", "Shared workspaces", "RBAC", "Private datasets", "CI integration", "API access"],
    cta: "Start Free Trial",
    popular: true,
    variant: "primary",
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
  return price === "$[TBD]" ? "Contact us" : price;
}

function PricingCard({ tier, annual }: { tier: Tier; annual: boolean }) {
  const isPlaceholder = displayPrice(tier, annual) === "Contact us";

  return (
    <article
      className={`group relative flex min-h-[32rem] flex-col rounded-2xl border bg-white p-6 transition duration-200 hover:-translate-y-1 ${
        tier.popular
          ? "border-[#2563EB]/30 ring-1 ring-[#2563EB]/10"
          : "border-black/[0.08] hover:border-black/[0.16]"
      }`}
    >
      {tier.popular && (
        <div className="mb-5 w-fit rounded-full bg-[#2563EB] px-3 py-1 text-xs font-medium text-white">
          Most Popular
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-[#111110]">{tier.name}</h3>
        <p className="mt-3 min-h-12 text-sm leading-6 text-[#4B4B48]">{tier.summary}</p>
      </div>

      <div className="mt-7">
        <p className={isPlaceholder ? "text-2xl font-semibold text-[#111110]" : "font-mono text-4xl text-[#111110]"}>
          {displayPrice(tier, annual)}
        </p>
        {!isPlaceholder && tier.price !== "Custom" && tier.price !== "$0" && (
          <p className="mt-2 text-sm text-[#8A8A85]">per month</p>
        )}
        {isPlaceholder && (
          <p className="mt-2 text-sm text-[#8A8A85]">Pricing finalized at launch</p>
        )}
      </div>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-[#4B4B48]">
            <Check className="mt-0.5 size-4 shrink-0 text-[#2563EB]" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`mt-8 inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${
          tier.variant === "primary"
            ? "bg-[#111110] text-white hover:bg-[#2a2a28]"
            : tier.variant === "enterprise"
              ? "border border-black/[0.12] bg-[#F7F7F5] text-[#111110] hover:bg-[#EBEBEA]"
              : "border border-black/[0.08] bg-[#F7F7F5] text-[#111110] hover:border-black/[0.16] hover:bg-[#EBEBEA]"
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
    <section id="pricing" className="skyboy-section bg-white">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">Pricing</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            Start free. Scale when you need to.
          </h2>

          <div className="mt-8 inline-flex items-center rounded-full border border-black/[0.08] bg-[#F7F7F5] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                !annual ? "bg-[#111110] text-white" : "text-[#4B4B48] hover:text-[#111110]"
              }`}
              aria-pressed={!annual}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                annual ? "bg-[#111110] text-white" : "text-[#4B4B48] hover:text-[#111110]"
              }`}
              aria-pressed={annual}
            >
              Annual
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  annual ? "bg-white/10 text-white" : "bg-[#16A34A]/10 text-[#16A34A]"
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
