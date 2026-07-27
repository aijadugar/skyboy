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
    <section id="faq" className="skyboy-section">
      <div className="skyboy-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-skyboy-success">FAQ</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-normal text-skyboy-text md:text-5xl">
            Questions, answered
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur sm:p-5">
          <Accordion type="single" collapsible className="gap-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index + 1}`}
                className="rounded-xl border border-white/[0.06] bg-skyboy-background/50 px-4 not-last:border-b-white/[0.06]"
              >
                <AccordionTrigger className="py-4 text-base text-skyboy-text hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-skyboy-text-secondary">
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
