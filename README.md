# RepoBench

Benchmark coding agents on **your own** repository history.

RepoBench replays merged pull requests and closed issues from your real codebase as reproducible benchmark tasks, runs coding agents (Claude, Codex, open-source models) in isolated sandboxes, and produces deterministic, comparable scores — so you can make agent adoption decisions backed by data from **your** repos, not synthetic datasets.

## Why RepoBench?

| Problem | RepoBench |
|---|---|
| Public benchmarks (SWE-bench, HumanEval) use fixed datasets that don't reflect your stack | Benchmarks on your actual codebase, dependencies, and conventions |
| Agent eval results are not reproducible | Deterministic metrics, sandboxed runs, versioned task sets |
| No way to compare agents side-by-side on *your* code | Head-to-head comparison on identical tasks from your repo history |
| Vendor claims are hard to verify internally | Self-hosted, privacy-first — your code never leaves your infrastructure |

## Quick Start

```bash
# Prerequisites: Node.js >=20, pnpm >=9, Docker

# Clone and install
git clone https://github.com/repobench/repobench.git
cd repobench
pnpm install

# Start local infrastructure (Postgres, Redis, MinIO)
pnpm docker:up

# Build all packages
pnpm build

# Import benchmark tasks from a GitHub repo
pnpm --filter @repobench/cli -- repobench init --repo owner/repo
pnpm --filter @repobench/cli -- repobench import --source github

# Run a benchmark
pnpm --filter @repobench/cli -- repobench run --agent claude --suite default

# View results
pnpm --filter @repobench/cli -- repobench report --run <run-id>
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      CLI / Dashboard                      │
├──────────────────────────────────────────────────────────┤
│                        API (Fastify)                      │
├────────────┬──────────┬──────────┬───────────────────────┤
│ Repo Ingest│  Task    │  Agent   │     Evaluator         │
│ (GitHub)   │  Builder │  Adapters│  (Deterministic)      │
├────────────┴──────────┴──────────┴───────────────────────┤
│                    Sandbox (Docker)                        │
├──────────────────────────────────────────────────────────┤
│            Worker Queue (Redis + BullMQ)                   │
├──────────────────────────────────────────────────────────┤
│       Postgres        │     S3-Compatible Artifacts       │
└──────────────────────────────────────────────────────────┘
```

## Project Structure

```
repobench/
├── apps/
│   ├── api/          # Fastify REST API
│   ├── cli/          # CLI tool
│   └── web/          # Next.js dashboard
├── packages/
│   ├── domain/       # Shared types and entities
│   ├── repo-ingest/  # GitHub/SCM data ingestion
│   ├── task-builder/ # PR/issue → benchmark task conversion
│   ├── agents/       # Agent adapter layer
│   ├── sandbox/      # Docker-based isolation
│   ├── evaluator/    # Deterministic scoring engine
│   ├── storage/      # Postgres + artifact store
│   └── ui/           # Shared UI components
├── services/
│   └── worker/       # Background job processor
├── tests/
│   ├── e2e/          # End-to-end tests
│   └── integration/  # Integration tests
└── docs/             # Product, architecture, ops docs
```

## Metrics

RepoBench produces deterministic, verifiable metrics:

- **Patch Apply** — Did the agent's diff apply cleanly?
- **Build Success** — Does the patched code compile?
- **Test Pass** — Do existing tests pass after the patch?
- **Task Pass** — End-to-end success (apply + build + test)
- **Duration** — Wall-clock time to completion
- **Token/Cost** — API token usage and estimated cost
- **One-Shot Rate** — Solved without retries

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev              # Start development servers
pnpm test             # Run unit tests
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript type checking
pnpm format:check     # Check formatting
```

See [DEVELOPERS.md](DEVELOPERS.md) for the full local setup guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

Apache-2.0 — see [LICENSE](LICENSE).
