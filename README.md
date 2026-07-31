<div align="center">
  <img src="./public/skyboy.png" alt="Skyboy logo" width="180" />

  # Skyboy - **Infrastructure for benchmarking and evaluating AI algorithms.**

</div>

## About

Skyboy is infrastructure for benchmarking and evaluating AI algorithms, starting with retrieval, reranking, and ranking systems.

Teams building these systems today rebuild the same tooling from scratch at every company — dataset handling, eval scripts, baseline comparison, regression tracking, deployment packaging. Skyboy replaces that with one workflow: push an algorithm via CLI or Git, Skyboy runs it against standardized or private benchmarks (BEIR, MTEB, or your own eval sets) in an isolated sandbox, scores it against baselines and your own previous versions, and flags regressions the moment they happen with the exact commit responsible.

We think of it as the missing third pillar of AI infrastructure — GitHub covers code, Hugging Face covers models and datasets, and Skyboy covers algorithm research, benchmarking, and evaluation.

## How it works

1. **Push** — Connect a GitHub repo or push an algorithm via CLI.
2. **Benchmark** — Skyboy pulls the relevant standardized dataset (BEIR, MTEB, LOCOMO, LongMemEval, or a private eval set) and runs your algorithm against it in an isolated sandbox.
3. **Score & track** — Results are scored against baselines and your own prior versions. Regressions are flagged immediately, tied to the exact commit responsible.

The output is a maintained, public or private leaderboard for the algorithm — comparable across versions, comparable across competing SDKs, and reproducible on demand.

## Who it's for

**Researchers & students**
Public algorithms, public benchmarks, and public leaderboards — free to use. Built for people iterating on new algorithms who currently have no standardized way to evaluate them.

**Companies & research labs**
Private repositories, private benchmark sets, team collaboration, compute, and enterprise features for teams that need proprietary evaluation workflows.

## What Skyboy is not

- Not a generic CI runner. Skyboy is metric-aware — it understands benchmarks, baselines, and regressions, not just pass/fail builds.
- Not a model or dataset host. Skyboy orchestrates evaluation; it doesn't replace Hugging Face.
- Not an experiment tracker for prompts or agents. Skyboy is built around the algorithm research lifecycle — comparing a new algorithm against standard benchmarks and tracking it across versions.

## Status

Skyboy is in early development. The landing page and leaderboard concept are live; the full CLI/CI platform is in progress.

## Contact

For questions, partnerships, or early access, reach out at the contact details listed on [skyboy.in](https://skyboy.in).

---

<div align="center">
  <sub>Built by Ankit Bari.</sub>
</div>