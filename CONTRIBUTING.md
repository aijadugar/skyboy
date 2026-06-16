# Contributing

Thanks for helping make Skyboy AI Patterns more useful for engineers building production AI systems.

## Add a New Pattern

1. Pick a category under `skyboy/content/patterns/`.
2. Create a slugged MDX file such as `my-pattern.mdx`.
3. Copy the frontmatter template below and fill in every field.
4. Write the required sections: Problem, When To Use, When NOT To Use, Architecture, Flow, Code, Benchmarks, References.
5. Run `cd skyboy && npm run build` and `cd skyboy && npm run lint`.
6. Open a PR with a short description of the production scenario the pattern covers.

## MDX Frontmatter Template

```mdx
---
title: Pattern Name
description: One sentence describing the production problem and approach.
category: agents
difficulty: intermediate
frameworks: ["openai", "langchain"]
models: ["gpt-4o-mini"]
tags: ["agents", "tools"]
featured: false
author: your-handle
updatedAt: 2025-06-01
githubUrl: https://github.com/your-org/example
---
```

## Pattern Quality Checklist

- The problem is specific and production-relevant.
- The "When To Use" section names real operating scenarios.
- The "When NOT To Use" section includes concrete anti-patterns.
- The Mermaid diagram describes the actual control/data flow.
- The Python code runs without hidden services unless clearly documented.
- TypeScript or Bash alternatives are included when they make implementation clearer.
- Benchmarks include latency, cost, and quality or accuracy.
- References include at least three credible docs, papers, repos, or guides.
- Security, privacy, and operational tradeoffs are named where relevant.
- The pattern can be understood and adapted in under five minutes.

## PR Process

1. Fork the repository.
2. Create a branch: `git checkout -b pattern/my-pattern`.
3. Commit focused changes with a clear message.
4. Open a PR and complete the checklist.

## Good First Issues

Good first issues should be scoped to one pattern, one example, one benchmark, or one documentation improvement. If you are new to the project, look for issues labeled `good first issue` or propose a small pattern using the new pattern issue template.

## Code of Conduct

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
