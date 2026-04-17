# Developer Guide

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** and Docker Compose
- **Git**

## Local Setup

```bash
# Clone the repository
git clone https://github.com/senoldogann/spartacus.git
cd spartacus

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start only dependency services for local app development
docker compose up -d postgres redis minio

# Build all packages
pnpm build

# Start development servers
pnpm dev
```

## Working Modes

Use one of these workflows, not both at the same time on the same ports.

### Full Docker stack

Use this when you want to try the product exactly as a local deployment:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

This starts Postgres, Redis, MinIO, the API, the worker, and the web dashboard.

### Local code development

Use this when you want to edit code and run the app with `pnpm dev`:

```bash
cp .env.example .env
docker compose up -d postgres redis minio
pnpm install
pnpm build
pnpm dev
```

The API applies the current schema automatically when it starts under `pnpm dev`. The current `pnpm db:migrate` script is a placeholder and should not be part of the normal setup flow.

## Project Layout

| Directory               | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `apps/api`              | Fastify REST API server                      |
| `apps/cli`              | Command-line interface                       |
| `apps/web`              | Next.js dashboard                            |
| `packages/domain`       | Shared TypeScript types and entities         |
| `packages/repo-ingest`  | GitHub/SCM data ingestion                    |
| `packages/task-builder` | PR/issue to benchmark task conversion        |
| `packages/agents`       | Agent adapter interfaces and implementations |
| `packages/sandbox`      | Docker-based isolated execution              |
| `packages/evaluator`    | Deterministic scoring engine                 |
| `packages/storage`      | Database and local artifact persistence      |
| `packages/ui`           | Shared React UI components                   |
| `services/worker`       | Background job processor (BullMQ)            |

## Common Commands

```bash
pnpm build            # Build all packages
pnpm dev              # Start all dev servers
pnpm test             # Run unit tests
pnpm test:integration # Run integration tests
pnpm test:e2e         # Run end-to-end tests
pnpm lint             # Lint all packages
pnpm lint:fix         # Auto-fix lint issues
pnpm typecheck        # TypeScript type checking
pnpm format           # Format all files
pnpm format:check     # Check formatting
pnpm clean            # Remove all build artifacts
pnpm docker:up        # Start the full Docker stack from docker-compose.yml
pnpm docker:down      # Stop the full Docker stack
```

## Package Dependencies

Packages reference each other via workspace protocol:

```json
{
  "dependencies": {
    "@repobench/domain": "workspace:*"
  }
}
```

Turborepo handles build ordering via the `turbo.json` pipeline configuration.

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable                       | Description                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `API_AUTH_TOKEN`               | Shared bearer token required by protected API endpoints            |
| `DATABASE_URL`                 | Postgres connection string                                         |
| `REDIS_URL`                    | Redis connection string                                            |
| `ARTIFACTS_DIR`                | Local directory for persisted patches and logs                     |
| `GITHUB_TOKEN`                 | GitHub API access token                                            |
| `ALLOW_HOSTED_AGENT_EXECUTION` | Must be `true` to allow Claude/Codex provider calls                |
| `ANTHROPIC_API_KEY`            | Credential for hosted Claude agent profiles                        |
| `OPENAI_API_KEY`               | Credential for hosted Codex agent profiles                         |
| `OPEN_SOURCE_API_KEY`          | Credential passed to local OpenAI-compatible endpoints when needed |

## Adding a New Package

1. Create the directory under `packages/`
2. Add a `package.json` with name `@repobench/<name>`
3. Add a `tsconfig.json` extending `../../tsconfig.base.json`
4. Add a reference in the root `tsconfig.json`
5. Run `pnpm install` to link
