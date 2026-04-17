# RepoBench

Benchmark coding agents on **your own** repository history.

RepoBench replays merged pull requests from your real codebase as reproducible benchmark tasks, runs coding agents (Claude, Codex, open-source models) against those tasks, and produces deterministic, comparable scores — so you can make agent adoption decisions backed by data from **your** repos, not synthetic datasets.

## Why RepoBench?

| Problem                                                                                   | RepoBench                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public benchmarks (SWE-bench, HumanEval) use fixed datasets that don't reflect your stack | Benchmarks on your actual codebase, dependencies, and conventions                                                                             |
| Agent eval results are not reproducible                                                   | Deterministic metrics, sandboxed runs, versioned task sets                                                                                    |
| No way to compare agents side-by-side on _your_ code                                      | Head-to-head comparison on identical tasks from your repo history                                                                             |
| Vendor claims are hard to verify internally                                               | Self-hosted by default; local/self-hosted agents keep code on your infrastructure, while hosted providers require an explicit API integration |

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

# Optional: create a local RepoBench config file
pnpm --filter @repobench/cli -- repobench init --repo owner/repo

# Hosted providers are opt-in because they send benchmark context off-box
export ALLOW_HOSTED_AGENT_EXECUTION=true

# Create a hosted agent profile
curl -X POST http://localhost:3001/api/agent-profiles \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Claude Sonnet","provider":"claude","model":"claude-sonnet-4.5","executionMode":"hosted","runtimeConfig":{"transport":"provider-api"}}'

# Or create a local open-source agent profile (loopback OpenAI-compatible endpoint)
curl -X POST http://localhost:3001/api/agent-profiles \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Local Qwen","provider":"open-source","model":"qwen2.5-coder:32b","executionMode":"local","runtimeConfig":{"transport":"openai-compatible-http","baseUrl":"http://127.0.0.1:11434/v1"}}'

# Register a repository
curl -X POST http://localhost:3001/api/repos \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"owner":"owner","name":"repo"}'

# Import a benchmark suite from merged PRs
curl -X POST http://localhost:3001/api/repos/<repo-id>/suites \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"default","testCommand":"pnpm test"}'

# Start a benchmark run
curl -X POST http://localhost:3001/api/suites/<suite-id>/runs \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentProfileId":"<agent-profile-id>"}'

# Fetch run results
curl -H "Authorization: Bearer $API_AUTH_TOKEN" \
  http://localhost:3001/api/runs/<run-id>/results
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
│       Postgres        │  Artifacts (local disk today)     │
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
- **Verification Command Pass** — Does the configured sandbox command succeed?
- **Task Pass** — End-to-end success (apply + verification command)
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
