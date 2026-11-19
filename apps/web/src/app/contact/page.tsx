import type { Metadata } from "next";
import { ContactForm, FeatureRequestForm } from "@/components/contact-forms";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Support, feedback, and partnership for Skyboy. Email contact@skyboy.in.",
};

export default function ContactPage() {
  return (
    <PageShell current="/contact">
      <PageHeader
        eyebrow="Contact"
        title="Write to the team."
        lede="Support, feedback, and partnership all go to contact@skyboy.in. The form opens that email with the fields below."
      />

      <p className="mt-6">
        <a
          href="mailto:contact@skyboy.in"
          className="font-mono text-sm text-pen hover:text-pen-deep"
        >
          contact@skyboy.in
        </a>
      </p>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Message</h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </section>
        <section id="feature-request" className="scroll-mt-24">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Feature request</h2>
          <p className="mt-2 text-sm leading-relaxed text-body">
            Tell us which agent, and what you want Skyboy to do.
          </p>
          <div className="mt-6">
            <FeatureRequestForm />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
