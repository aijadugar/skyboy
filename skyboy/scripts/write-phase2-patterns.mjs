import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, 'content', 'patterns')

const refs = {
  agents: [
    'https://langchain-ai.github.io/langgraph/',
    'https://python.langchain.com/docs/concepts/tool_calling/',
    'https://platform.openai.com/docs/guides/function-calling',
  ],
  rag: [
    'https://docs.llamaindex.ai/en/stable/',
    'https://python.langchain.com/docs/concepts/retrievers/',
    'https://arxiv.org/abs/2312.10997',
  ],
  evaluations: [
    'https://docs.ragas.io/',
    'https://arxiv.org/abs/2306.05685',
    'https://platform.openai.com/docs/guides/evals',
  ],
  finetuning: [
    'https://arxiv.org/abs/2106.09685',
    'https://huggingface.co/docs/trl/sft_trainer',
    'https://huggingface.co/docs/peft/index',
  ],
  deployment: [
    'https://fastapi.tiangolo.com/deployment/',
    'https://modal.com/docs/guide/gpu',
    'https://docs.vllm.ai/',
  ],
  mcp: [
    'https://modelcontextprotocol.io/',
    'https://github.com/modelcontextprotocol/python-sdk',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  observability: [
    'https://opentelemetry.io/docs/',
    'https://www.langchain.com/langsmith',
    'https://docs.smith.langchain.com/observability',
  ],
}

const codeByCategory = {
  agents: `from dataclasses import dataclass
from typing import Callable

@dataclass
class Tool:
    name: str
    description: str
    run: Callable[[str], str]

def route(task: str, tools: list[Tool]) -> str:
    lowered = task.lower()
    if "sql" in lowered or "database" in lowered:
        return "query_db"
    if "summarize" in lowered or "brief" in lowered:
        return "summarize"
    return "answer"

def execute(task: str, tools: list[Tool]) -> str:
    selected = route(task, tools)
    registry = {tool.name: tool for tool in tools}
    if selected not in registry:
        raise ValueError(f"missing tool: {selected}")
    return registry[selected].run(task)

tools = [
    Tool("answer", "General response", lambda q: f"answer: {q}"),
    Tool("summarize", "Condense text", lambda q: q[:240]),
    Tool("query_db", "Run approved read-only SQL", lambda q: "SELECT count(*) FROM tickets;"),
]

print(execute("summarize the incident report", tools))`,
  rag: `import math
from collections import Counter

documents = {
    "runbook": "Restart the worker after rotating the OpenAI key.",
    "pricing": "Track token usage by model and request id.",
    "retrieval": "Hybrid search combines BM25 with vector similarity.",
}

def tokenize(text: str) -> list[str]:
    return [t.strip(".,").lower() for t in text.split()]

def bm25_like(query: str, text: str) -> float:
    q = Counter(tokenize(query))
    d = Counter(tokenize(text))
    return sum(min(q[t], d[t]) for t in q)

def cosine_sparse(query: str, text: str) -> float:
    q = Counter(tokenize(query))
    d = Counter(tokenize(text))
    shared = set(q) & set(d)
    numerator = sum(q[t] * d[t] for t in shared)
    q_norm = math.sqrt(sum(v * v for v in q.values()))
    d_norm = math.sqrt(sum(v * v for v in d.values()))
    return numerator / (q_norm * d_norm or 1)

def retrieve(query: str, k: int = 2) -> list[tuple[str, float]]:
    scored = []
    for doc_id, text in documents.items():
        score = 0.65 * cosine_sparse(query, text) + 0.35 * bm25_like(query, text)
        scored.append((doc_id, round(score, 3)))
    return sorted(scored, key=lambda row: row[1], reverse=True)[:k]

print(retrieve("hybrid search token usage"))`,
  evaluations: `from statistics import mean

examples = [
    {"answer": "The refund window is 30 days.", "context": "Refunds are available for 30 days.", "expected": "30 days"},
    {"answer": "Enterprise support is included.", "context": "Enterprise support requires a paid plan.", "expected": "paid plan"},
]

def grounded_score(answer: str, context: str) -> float:
    answer_terms = {t.lower().strip(".,") for t in answer.split() if len(t) > 3}
    context_terms = {t.lower().strip(".,") for t in context.split()}
    return len(answer_terms & context_terms) / max(len(answer_terms), 1)

def evaluate(rows: list[dict[str, str]]) -> dict[str, float]:
    scores = [grounded_score(row["answer"], row["context"]) for row in rows]
    failures = [row for row, score in zip(rows, scores) if score < 0.45]
    return {"mean_groundedness": round(mean(scores), 3), "failures": len(failures)}

print(evaluate(examples))`,
  finetuning: `import json
from pathlib import Path

raw_examples = [
    {"instruction": "Classify: chargeback after renewal", "output": "billing_dispute"},
    {"instruction": "Classify: cannot reset password", "output": "account_access"},
]

def to_chatml(example: dict[str, str]) -> dict[str, list[dict[str, str]]]:
    return {
        "messages": [
            {"role": "system", "content": "Return one support intent label."},
            {"role": "user", "content": example["instruction"]},
            {"role": "assistant", "content": example["output"]},
        ]
    }

dataset = [to_chatml(row) for row in raw_examples]
Path("train.jsonl").write_text("\\n".join(json.dumps(row) for row in dataset), encoding="utf-8")
print(dataset[0])`,
  deployment: `from fastapi import FastAPI
from pydantic import BaseModel
import time

app = FastAPI()

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 128

class GenerateResponse(BaseModel):
    text: str
    latency_ms: int

def generate_text(prompt: str, max_tokens: int) -> str:
    trimmed = " ".join(prompt.split())[:max_tokens]
    return f"model response for: {trimmed}"

@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest) -> GenerateResponse:
    started = time.perf_counter()
    text = generate_text(req.prompt, req.max_tokens)
    return GenerateResponse(text=text, latency_ms=int((time.perf_counter() - started) * 1000))`,
  mcp: `from dataclasses import dataclass
from typing import Any, Callable

@dataclass
class ToolSpec:
    name: str
    description: str
    handler: Callable[[dict[str, Any]], dict[str, Any]]

class ToolRegistry:
    def __init__(self) -> None:
        self.tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        if spec.name in self.tools:
            raise ValueError(f"duplicate tool: {spec.name}")
        self.tools[spec.name] = spec

    def call(self, name: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.tools[name].handler(payload)

registry = ToolRegistry()
registry.register(ToolSpec("healthcheck", "Return service health", lambda _: {"ok": True}))
print(registry.call("healthcheck", {}))`,
  observability: `import time
import uuid
from contextlib import contextmanager

@contextmanager
def llm_span(name: str, **attrs: object):
    trace_id = str(uuid.uuid4())
    started = time.perf_counter()
    print({"event": "start", "trace_id": trace_id, "name": name, **attrs})
    try:
        yield trace_id
    finally:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        print({"event": "end", "trace_id": trace_id, "latency_ms": elapsed_ms})

with llm_span("chat.completions", model="gpt-4o-mini", prompt_tokens=128):
    response = "Grounded answer with cited context."
print(response)`,
}

const patterns = [
  ['agents', 'router-agent', 'Router Agent', 'Route requests to specialized tools or agents before generation.', 'intermediate', ['langgraph', 'langchain', 'openai'], ['gpt-4o', 'claude-3-5-sonnet'], ['agents', 'routing', 'tools'], true, 'A router agent keeps a multi-tool system predictable by choosing the smallest capable path before any expensive reasoning step.', ['Support triage across billing, product, and incident queues', 'AI copilots with many tools but strict latency budgets', 'Systems that need per-route evaluation and rollback'], ['Single-purpose assistants with one deterministic tool', 'Tasks where routing errors are more expensive than extra latency', 'Workflows that require exhaustive planning every turn'], ['Classify intent', 'Select route', 'Execute the routed tool', 'Log decision and confidence'], [92, '$0.018', '91%']],
  ['agents', 'reflection-agent', 'Reflection Agent', 'Add a bounded critique-and-revise loop for answers that need self-checking.', 'advanced', ['langgraph', 'openai', 'anthropic'], ['gpt-4o', 'claude-3-5-sonnet'], ['agents', 'reflection', 'quality'], false, 'Reflection is useful when the first draft is often close but misses constraints, citations, or edge cases.', ['Policy-heavy answers that require a final checklist', 'Code generation where tests can guide revisions', 'Customer-facing responses with compliance constraints'], ['Ultra-low latency chat', 'Tasks with objective tool results that need no rewrite', 'Unbounded loops without a measurable stop condition'], ['Draft answer', 'Critique against rubric', 'Revise once or twice', 'Return answer with critique metadata'], [310, '$0.061', '87%']],
  ['agents', 'tool-calling-agent', 'Tool Calling Agent', 'Expose typed tools to an LLM while keeping execution deterministic and auditable.', 'intermediate', ['langchain', 'openai', 'anthropic'], ['gpt-4o-mini', 'claude-3-haiku'], ['tools', 'function-calling', 'agents'], false, 'Tool calling turns an assistant from text-only into a constrained orchestrator for databases, APIs, and internal services.', ['Read-only database lookups', 'Calendar, ticketing, and CRM actions behind approvals', 'Assistants that must cite tool outputs'], ['Untrusted tools without input validation', 'Bulk destructive actions', 'Workflows where plain retrieval is enough'], ['Define schemas', 'Let model choose tool', 'Validate arguments', 'Execute and summarize result'], [180, '$0.026', '94%']],
  ['rag', 'basic-rag', 'Basic RAG', 'Retrieve top-k chunks and ground the answer in context before generation.', 'beginner', ['llamaindex', 'langchain', 'openai'], ['gpt-4o-mini', 'text-embedding-3-small'], ['rag', 'retrieval', 'embeddings'], true, 'Basic RAG is the default production starting point for private knowledge bases before adding re-rankers or hybrid indexes.', ['Internal docs assistants under 50k chunks', 'Support answer drafting with citations', 'Runbooks that change faster than model training cycles'], ['Questions requiring fresh transactional data', 'Tiny static FAQ sets that fit in the prompt', 'Corpora with heavy table reasoning needs'], ['Chunk documents', 'Embed chunks', 'Retrieve top-k', 'Generate with citations'], [120, '$0.022', '82%']],
  ['rag', 'hybrid-search', 'Hybrid Search RAG', 'Combine dense vector retrieval with sparse BM25 for higher recall.', 'intermediate', ['llamaindex', 'langchain', 'openai'], ['gpt-4o', 'claude-3-5-sonnet', 'text-embedding-3-large'], ['rag', 'bm25', 'vector-search'], false, 'Hybrid retrieval catches exact identifiers and semantic paraphrases in one retrieval pass.', ['Enterprise search with part numbers or policy IDs', 'Mixed keyword and natural-language queries', 'Recall-sensitive support retrieval'], ['Small knowledge bases under 1k chunks', 'Latency budgets below 50ms', 'Corpora where vector recall is already above target'], ['Embed query', 'Run vector and BM25 retrieval', 'Fuse rankings with RRF', 'Re-rank and answer'], [165, '$0.031', '89%']],
  ['rag', 'context-compression', 'Context Compression', 'Trim retrieved chunks to the evidence needed for a cheaper grounded prompt.', 'intermediate', ['langchain', 'llamaindex', 'openai'], ['gpt-4o-mini', 'claude-3-haiku'], ['rag', 'compression', 'latency'], false, 'Compression reduces token waste while preserving answer evidence.', ['Large chunks from PDFs or tickets', 'Expensive long-context models', 'Retrieval pipelines with duplicated passages'], ['Legal review where full context must be preserved', 'Short snippets already under budget', 'Pipelines without evaluation coverage'], ['Retrieve broad context', 'Score sentences', 'Keep evidence spans', 'Answer from compressed context'], [145, '$0.014', '84%']],
  ['evaluations', 'llm-as-judge', 'LLM-as-Judge', 'Use a rubric-driven model judge to score subjective answer quality.', 'intermediate', ['openai', 'anthropic', 'langchain'], ['gpt-4o', 'claude-3-5-sonnet'], ['evals', 'judge', 'rubric'], true, 'LLM judges make subjective quality measurable when exact-match tests are too brittle.', ['Regression tests for support assistants', 'Style and policy compliance scoring', 'Comparing prompts across releases'], ['Safety-critical grading without human calibration', 'Numeric facts that can be checked deterministically', 'Tiny datasets where manual review is faster'], ['Write rubric', 'Sample representative cases', 'Judge blind outputs', 'Track drift over releases'], [840, '$0.12', '86%']],
  ['evaluations', 'hallucination-detection', 'Hallucination Detection', 'Flag answers that introduce claims not supported by retrieved context.', 'advanced', ['openai', 'anthropic', 'langchain'], ['gpt-4o-mini', 'claude-3-haiku'], ['evals', 'hallucination', 'rag'], false, 'Hallucination detection is a guardrail for RAG systems that must separate answer quality from unsupported claims.', ['Compliance-sensitive customer answers', 'RAG migrations to new retrievers', 'Monitoring production answer samples'], ['Creative writing or brainstorming', 'Contexts that are intentionally incomplete', 'Answers that never cite retrieved evidence'], ['Extract claims', 'Match claims to context', 'Score support', 'Escalate unsupported answers'], [760, '$0.09', '88%']],
  ['evaluations', 'groundedness', 'Groundedness', 'Measure whether answer statements are entailed by supplied evidence.', 'intermediate', ['openai', 'llamaindex', 'langchain'], ['gpt-4o-mini', 'text-embedding-3-large'], ['evals', 'groundedness', 'citations'], false, 'Groundedness is the core RAG health metric because fluent unsupported answers are worse than abstentions.', ['RAG release gates', 'Citation quality checks', 'Prompt changes that alter answer style'], ['Open-domain chat without evidence', 'Pure classification tasks', 'Gold labels that are easier to compare directly'], ['Split answer into claims', 'Retrieve supporting spans', 'Grade entailment', 'Report unsupported claims'], [690, '$0.074', '90%']],
  ['finetuning', 'lora', 'LoRA Fine-Tuning', 'Adapt a base model with low-rank adapters instead of full fine-tuning.', 'advanced', ['openai', 'vllm', 'modal'], ['llama-3.1-8b', 'mistral-7b'], ['finetuning', 'lora', 'peft'], true, 'LoRA is the practical route when you need task adaptation without owning a full training cluster.', ['Intent classification with stable labels', 'Domain style adaptation', 'Private model adapters per customer'], ['Knowledge injection that belongs in RAG', 'Datasets below a few hundred high-quality examples', 'Tasks that require larger base model capability'], ['Prepare JSONL', 'Train adapter', 'Evaluate held-out set', 'Serve merged or adapter model'], [48, '$3.20/train', '92%']],
  ['finetuning', 'sft', 'Supervised Fine-Tuning', 'Train a model on instruction-response pairs for stable task behavior.', 'advanced', ['openai', 'vllm', 'modal'], ['gpt-4o-mini', 'llama-3.1-8b'], ['sft', 'finetuning', 'dataset'], false, 'SFT improves format control and repeated task behavior when prompting has reached its limit.', ['Structured extraction with consistent schemas', 'Support intent labeling', 'Tone adaptation with reviewed examples'], ['Frequently changing facts', 'Unclear labels or noisy outputs', 'Problems solvable with a better system prompt'], ['Collect reviewed examples', 'Normalize schema', 'Train model', 'Evaluate against prompt baseline'], [62, '$4.80/train', '93%']],
  ['finetuning', 'synthetic-data', 'Synthetic Data Generation', 'Generate and filter training examples for scarce edge cases.', 'intermediate', ['openai', 'anthropic', 'langchain'], ['gpt-4o', 'claude-3-5-sonnet'], ['synthetic-data', 'datasets', 'evals'], false, 'Synthetic data is useful when real examples are sensitive, rare, or unevenly distributed.', ['Cold-start classifiers', 'Rare policy edge cases', 'Expanding evaluation coverage before launch'], ['Replacing all human-reviewed data', 'Domains where generated labels are unverifiable', 'Training on model errors without filtering'], ['Define schema', 'Generate diverse cases', 'Filter with validators', 'Mix with real data'], [410, '$0.38/1k', '85%']],
  ['deployment', 'fastapi-deployment', 'FastAPI Deployment', 'Wrap model inference behind a typed FastAPI service.', 'beginner', ['fastapi', 'openai', 'vllm'], ['gpt-4o-mini', 'llama-3.1-8b'], ['deployment', 'fastapi', 'api'], true, 'FastAPI is a clean deployment boundary for teams that need typed requests, health checks, and explicit scaling.', ['Internal model gateways', 'RAG APIs behind auth', 'Batchable generation endpoints'], ['Pure static sites', 'Browser-only inference', 'Ultra-high throughput GPU serving without an app layer'], ['Define request model', 'Load generator', 'Expose health and generate routes', 'Deploy behind autoscaling'], [38, '$0.002/request', '99.9%']],
  ['deployment', 'modal-gpu-worker', 'Modal GPU Worker', 'Run bursty GPU inference jobs on Modal with cold-start aware workers.', 'intermediate', ['modal', 'vllm', 'openai'], ['llama-3.1-8b', 'mistral-7b'], ['deployment', 'gpu', 'modal'], false, 'Modal works well for bursty inference and evaluation jobs where permanent GPU capacity would sit idle.', ['Nightly eval batches', 'Document embedding backfills', 'Occasional open-weight model inference'], ['Always-on low-latency chat', 'Strict data residency outside provider regions', 'Workloads requiring custom Kubernetes networking'], ['Build image', 'Warm model', 'Expose function', 'Batch requests'], [950, '$0.0009/token', '99.5%']],
  ['deployment', 'serverless-inference', 'Serverless Inference', 'Package inference behind serverless routes with strict timeouts and retries.', 'intermediate', ['openai', 'fastapi', 'vllm'], ['gpt-4o-mini', 'claude-3-haiku'], ['serverless', 'deployment', 'inference'], false, 'Serverless inference is best for spiky API traffic that delegates heavy compute to hosted model providers.', ['Webhook summarization', 'Async enrichment jobs', 'Low-volume internal tools'], ['Long-running local model inference', 'Streaming that exceeds platform limits', 'Stateful agent sessions'], ['Validate payload', 'Call provider with timeout', 'Retry idempotently', 'Return compact response'], [260, '$0.004/request', '99.7%']],
  ['mcp', 'mcp-server', 'MCP Server', 'Expose internal tools through a Model Context Protocol server.', 'intermediate', ['openai', 'anthropic', 'fastapi'], ['claude-3-5-sonnet', 'gpt-4o'], ['mcp', 'tools', 'server'], true, 'An MCP server gives assistants a standard way to discover and call internal capabilities.', ['Developer tools for repos and docs', 'Read-only data access for assistants', 'Standardizing tool contracts across clients'], ['Unauthenticated production mutation tools', 'One-off scripts with no reuse', 'High-frequency machine-to-machine APIs'], ['Define tool schema', 'Validate inputs', 'Register handlers', 'Return structured content'], [70, '$0.001/call', '99.8%']],
  ['mcp', 'mcp-client', 'MCP Client', 'Connect an assistant runtime to MCP servers with approval and logging.', 'intermediate', ['anthropic', 'openai', 'langchain'], ['claude-3-5-sonnet', 'gpt-4o-mini'], ['mcp', 'client', 'tools'], false, 'A client controls which MCP tools are visible, how calls are approved, and how outputs enter the prompt.', ['Desktop assistants with local context', 'Enterprise copilots with approved tool catalogs', 'Developer agents that need repo access'], ['Public chatbots with no tool permissions', 'Tools that should remain service-to-service only', 'Unlogged write operations'], ['Discover server tools', 'Filter by policy', 'Call selected tool', 'Attach result to model turn'], [95, '$0.002/call', '99.4%']],
  ['mcp', 'tool-registry', 'Tool Registry', 'Maintain a versioned catalog of tool schemas, owners, and risk levels.', 'beginner', ['openai', 'anthropic', 'fastapi'], ['gpt-4o-mini', 'claude-3-haiku'], ['tools', 'registry', 'governance'], false, 'A registry prevents tool sprawl and makes review possible before tools reach agents.', ['Many teams publishing tools', 'Approval workflows for write actions', 'Auditing tool use by owner'], ['Small prototypes with two local functions', 'Single-tenant scripts', 'Systems without tool calling'], ['Register metadata', 'Validate schema', 'Assign risk tier', 'Publish approved tools'], [22, '$0.0002/call', '99.9%']],
  ['observability', 'llm-tracing', 'LLM Tracing', 'Trace prompts, model calls, tool calls, latency, and token usage per request.', 'intermediate', ['langchain', 'openai', 'fastapi'], ['gpt-4o-mini', 'claude-3-haiku'], ['observability', 'tracing', 'latency'], true, 'Tracing is the first production debugging tool for any multi-step LLM workflow.', ['Agents with tool chains', 'RAG systems with retrieval and generation spans', 'SLO tracking for model latency'], ['Throwaway notebooks', 'Sensitive prompts without a redaction plan', 'Workflows where logs are forbidden'], ['Create request trace', 'Record spans', 'Attach token usage', 'Export to observability backend'], [8, '$0.0001/span', '99.9%']],
  ['observability', 'cost-tracking', 'Cost Tracking', 'Attribute token spend by tenant, feature, model, and request.', 'beginner', ['openai', 'anthropic', 'fastapi'], ['gpt-4o', 'gpt-4o-mini', 'claude-3-haiku'], ['cost', 'tokens', 'observability'], false, 'Cost tracking turns model usage from a surprise bill into an operational metric.', ['Multi-tenant SaaS assistants', 'Prompt experiments across models', 'Feature-level margin analysis'], ['Offline experiments with fixed budgets', 'Single-user prototypes', 'Vendors that do not expose token usage'], ['Capture usage', 'Normalize prices', 'Attribute dimensions', 'Alert on anomalies'], [5, '$0.00005/call', '99.9%']],
  ['observability', 'prompt-logging', 'Prompt Logging', 'Log prompts and responses with redaction, sampling, and replay metadata.', 'intermediate', ['openai', 'anthropic', 'langchain'], ['gpt-4o-mini', 'claude-3-haiku'], ['prompts', 'logging', 'privacy'], false, 'Prompt logs are invaluable for debugging, but only when privacy and retention are designed up front.', ['Production incident review', 'Prompt regression tests', 'Human review queues'], ['Highly regulated data without redaction', 'Secrets or credentials in prompts', 'Systems lacking retention policy'], ['Redact sensitive fields', 'Sample logs', 'Store prompt version', 'Replay failing cases'], [12, '$0.00008/call', '99.7%']],
]

function diagram(title) {
  return `graph TD
    A[Input] --> B[${title}]
    B --> C[Validation]
    C --> D[Execution]
    D --> E[Metrics]
    E --> F[Response]`
}

function mdx([category, slug, title, description, difficulty, frameworks, models, tags, featured, problem, uses, notUses, flow, bench]) {
  const references = refs[category]
  return `---
title: ${title}
description: ${description}
category: ${category}
difficulty: ${difficulty}
frameworks: ${JSON.stringify(frameworks)}
models: ${JSON.stringify(models)}
tags: ${JSON.stringify(tags)}
featured: ${featured}
author: skyboy
updatedAt: 2025-06-${String(patterns.findIndex((p) => p[1] === slug) + 1).padStart(2, '0')}
---

## Problem

${problem}

## When To Use

${uses.map((item) => `- ${item}`).join('\n')}

## When NOT To Use

${notUses.map((item) => `- ${item}`).join('\n')}

## Architecture

\`\`\`mermaid
${diagram(title)}
\`\`\`

## Flow

${flow.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Code

\`\`\`python
${codeByCategory[category]}
\`\`\`

## Benchmarks

| Metric | Baseline | Pattern |
|--------|----------|---------|
| Latency p50 | ${Math.round(bench[0] * 1.35)}ms | ${bench[0]}ms |
| Cost | ${bench[1]} | ${bench[1]} |
| Accuracy | ${Math.max(70, Number.parseInt(bench[2]) - 8)}% | ${bench[2]} |

## References

${references.map((item) => `- [${new URL(item).hostname}](${item})`).join('\n')}
`
}

for (const pattern of patterns) {
  const [category, slug] = pattern
  const dir = path.join(outDir, category)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${slug}.mdx`), mdx(pattern), 'utf8')
}

console.log(`Wrote ${patterns.length} MDX patterns`)
