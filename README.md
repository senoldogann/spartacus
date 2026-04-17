# RepoBench

Benchmark coding agents on **your own** repository history.

RepoBench replays merged pull requests from your real codebase as reproducible benchmark tasks, runs coding agents (Claude, Codex, open-source models) against those tasks, and produces deterministic, comparable scores — so you can make agent adoption decisions backed by data from **your** repos, not synthetic datasets.

## Why RepoBench?

| Problem                                                                                   | RepoBench                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public benchmarks (SWE-bench, HumanEval) use fixed datasets that don't reflect your stack | Benchmarks on your actual codebase, dependencies, and conventions                                                                             |
| Agent eval results are not reproducible                                                   | Deterministic verification, versioned task sets, and stored run metadata                                                                      |
| No way to compare agents side-by-side on _your_ code                                      | Head-to-head comparison on identical tasks from your repo history                                                                             |
| Vendor claims are hard to verify internally                                               | Self-hosted by default; local/self-hosted agents keep code on your infrastructure, while hosted providers require an explicit API integration |

## Quick Start

```bash
# Prerequisites for the fastest trial: Docker
# Prerequisites for CLI/local development: Node.js >=20, pnpm >=9, Docker

# Clone the repository
git clone https://github.com/senoldogann/spartacus.git
cd spartacus

# Create a local environment file
cp .env.example .env

# Edit .env before your first real benchmark:
# - set GITHUB_TOKEN
# - set API_AUTH_TOKEN to a strong local bearer token
# - set one of ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPEN_SOURCE_API_KEY
# - set ALLOW_HOSTED_AGENT_EXECUTION=true if you want Claude/Codex provider calls

# Start the full local stack (Postgres, Redis, MinIO, API, worker, web)
docker compose up -d --build

# Wait for services to be ready
# postgres, redis, minio, and api should become healthy; web should be up
docker compose ps
```

Then visit `http://localhost:3000`.

If you also want the CLI or local code development workflow, run:

```bash
pnpm install
pnpm build
```

## How To Use It Today

RepoBench currently has three user surfaces:

- **Web dashboard** for browsing repositories, runs, run details, and comparisons
- **REST API** for creating agent profiles, repositories, suites, and runs
- **CLI** for importing suites, starting runs, and printing reports

The current dashboard is read-only for creation flows. After cloning the repo, the UI may look empty until you create a repository, a suite, and a run through the API or CLI.

These URLs are the current entry points:

- `/repos` lists connected repositories
- `/runs?suiteId=<suite-id>` lists runs for one suite
- `/runs/<run-id>` shows run details and attempts
- `/compare?runA=<run-id>&runB=<run-id>` compares two runs from the same suite

## First Real Benchmark

Load the same auth token you put in `.env`:

```bash
export API_AUTH_TOKEN="<your API_AUTH_TOKEN from .env>"
```

Create an agent profile.

Hosted Codex example:

```bash
curl -X POST http://localhost:3001/api/agent-profiles \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Codex","provider":"codex","model":"gpt-4o","executionMode":"hosted","runtimeConfig":{"transport":"provider-api"}}'

# Copy the returned agentProfile.id value from the JSON response
export AGENT_PROFILE_ID="<agent-profile-id>"
```

Local OpenAI-compatible example:

```bash
curl -X POST http://localhost:3001/api/agent-profiles \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Local Qwen","provider":"open-source","model":"qwen2.5-coder:32b","executionMode":"local","runtimeConfig":{"transport":"openai-compatible-http","baseUrl":"http://127.0.0.1:11434/v1"}}'
```

Register a repository:

```bash
curl -X POST http://localhost:3001/api/repos \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"owner":"owner","name":"repo"}'

# Copy the returned repo.id value from the JSON response
export REPO_ID="<repo-id>"
```

Create a benchmark suite from merged PRs:

```bash
curl -X POST http://localhost:3001/api/repos/$REPO_ID/suites \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"default","testCommand":"pnpm test"}'

# Copy the returned suite.id value from the JSON response
export SUITE_ID="<suite-id>"
```

Start a benchmark run:

```bash
curl -X POST http://localhost:3001/api/suites/$SUITE_ID/runs \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentProfileId":"'"$AGENT_PROFILE_ID"'"}'

# Copy the returned run.id value from the JSON response
export RUN_ID="<run-id>"
```

Fetch a run report:

```bash
curl -H "Authorization: Bearer $API_AUTH_TOKEN" \
  http://localhost:3001/api/runs/$RUN_ID/report
```

Then open the corresponding dashboard pages by ID, for example:

```text
http://localhost:3000/runs?suiteId=$SUITE_ID
http://localhost:3000/runs/$RUN_ID
```

## Empty Pages Explained

- `/repos` is empty until you register at least one repository.
- `/runs` without a `suiteId` only shows an instruction message.
- `/compare` without both `runA` and `runB` only shows an instruction message.
- If you want a form-based onboarding flow in the browser, that has not been built yet.

## CLI Flow

The CLI is useful once the API is running and your `.env` values are loaded:

```bash
# Optional: create a local RepoBench config file
pnpm --filter @repobench/cli -- repobench init --repo owner/repo

# Create a repo and suite from merged PRs
pnpm --filter @repobench/cli -- repobench import \
  --repo owner/name \
  --test-command 'pnpm test'

# Start a run after you have an agent profile ID
pnpm --filter @repobench/cli -- repobench run \
  --suite <suite-id> \
  --agent <agent-profile-id>

# Print a run report
pnpm --filter @repobench/cli -- repobench report --run <run-id>

# Compare two runs
pnpm --filter @repobench/cli -- repobench compare \
  --run-a <run-id-a> \
  --run-b <run-id-b>
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
repo-root/
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
# Local app development against only the dependency services
docker compose up -d postgres redis minio

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

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities and the current execution boundary.

## License

Apache-2.0 — see [LICENSE](LICENSE).
