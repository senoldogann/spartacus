# Positioning

## Why RepoBench?

RepoBench exists because the current approach to evaluating coding agents is broken for teams making real adoption decisions.

### The Gap

| What exists | What's missing |
|---|---|
| SWE-bench scores on curated Python repos | Benchmarks on YOUR stack (TypeScript, Go, Rust, etc.) |
| Vendor-published accuracy numbers | Reproducible results on your private codebase |
| One-off manual testing | Automated, repeatable comparison pipeline |
| Generic coding challenges | Real-world bug fixes from your actual PRs |

### Why Now?

1. **Agent proliferation** — Claude Code, Codex, Cursor, Aider, Devin, open-source alternatives. Teams need objective comparison.
2. **Budget scrutiny** — AI tool spending requires justification. "It feels faster" is not a procurement argument.
3. **Model regression risk** — New model versions can degrade on specific codebases. Teams need regression detection.
4. **Compliance requirements** — Enterprises need evidence that AI-generated code meets quality standards on their code.

### Why Not Alternatives?

| Alternative | Limitation |
|---|---|
| SWE-bench | Fixed dataset, Python-heavy, not your code |
| LangSmith / Braintrust | General LLM eval, not coding-agent specific |
| Manual testing | Not reproducible, not scalable |
| Internal scripts | No sandboxing, no standardized metrics |
