import { getFeaturedSkills } from "@/lib/catalog";
import { Hero } from "@/components/hero";
import { FeaturedSkills } from "@/components/featured-skills";
import { SupportedAgents } from "@/components/supported-agents";
import { ValueProp } from "@/components/value-prop";
import { Footer } from "@/components/footer";

export default function Home() {
  const featured = getFeaturedSkills();
  const [feature, ...rest] = featured;
  return (
    <main className="min-h-[100dvh]">
      {feature && <Hero feature={feature} />}
      <SupportedAgents />
      <FeaturedSkills skills={featured} />
      <ValueProp />
      <Footer />
    </main>
  );
}
