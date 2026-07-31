import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "What kinds of algorithms can I evaluate on Skyboy?",
    answer:
      "Skyboy starts with retrieval, reranking, and ranking algorithms: dense, sparse, and hybrid retrievers, plus learning-to-rank models. More categories like agents and reasoning systems are on the roadmap.",
  },
  {
    question: "Do I need to change my code to use Skyboy?",
    answer:
      "No. You implement a small, typed interface with a couple of methods so Skyboy's harness can call your algorithm, with no framework lock-in.",
  },
  {
    question: "How does sandboxing work - is my code or data exposed?",
    answer:
      "Every run executes in an isolated, ephemeral sandbox with no persistent state and no outbound network access by default. Private algorithms and datasets are never used to train anything or shared outside your org.",
  },
  {
    question: "What's the difference between Skyboy and Weights & Biases or Braintrust?",
    answer:
      "Weights & Biases tracks experiments generically, and Braintrust focuses on LLM and prompt evaluation. Skyboy is purpose-built around the full algorithm lifecycle: benchmarking, baseline comparison, and regression detection specifically for retrieval, ranking, and reasoning systems, not just logging.",
  },
  {
    question: "Can I bring my own datasets and benchmarks?",
    answer: "Yes. Upload private evaluation sets or use built-in public benchmarks like BEIR and MTEB.",
  },
  {
    question: "Is Skyboy reproducible?",
    answer:
      "Every run is pinned to an exact algorithm version, dataset version, and environment. Skyboy periodically re-verifies historical runs and marks them as independently confirmed.",
  },
  {
    question: "Do you support on-prem or VPC deployment?",
    answer: "Yes, on the Enterprise plan, along with SSO, audit logs, and custom benchmark suites.",
  },
] as const;

export default function Faq() {
  return (
    <section id="faq" className="skyboy-section bg-[#FAFAF8]">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-[#2563EB]">FAQ</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111110] md:text-5xl">
            Questions, answered
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-black/[0.08] bg-white p-3 sm:p-5">
          <Accordion type="single" collapsible className="gap-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index + 1}`}
                className="rounded-xl border border-black/[0.06] bg-[#FAFAF8] px-4 not-last:border-b-black/[0.06]"
              >
                <AccordionTrigger className="py-4 text-base text-[#111110] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-[#4B4B48]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
