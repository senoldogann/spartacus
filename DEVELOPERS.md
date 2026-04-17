# Developer Guide

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** and Docker Compose
- **Git**

## Local Setup

```bash
# Clone the repository
git clone https://github.com/repobench/repobench.git
cd repobench

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (Postgres, Redis, plus an unused MinIO service kept for future artifact-store work)
pnpm docker:up

# Run database migrations
pnpm db:migrate

# Build all packages
pnpm build

# Start development servers
pnpm dev
```

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
pnpm docker:up        # Start local infrastructure
pnpm docker:down      # Stop local infrastructure
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

| Variable         | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `API_AUTH_TOKEN` | Shared bearer token required by protected API endpoints |
| `DATABASE_URL`   | Postgres connection string                              |
| `REDIS_URL`      | Redis connection string                                 |
| `ARTIFACTS_DIR`  | Local directory for persisted patches and logs          |
| `GITHUB_TOKEN`   | GitHub API access token                                 |

## Adding a New Package

1. Create the directory under `packages/`
2. Add a `package.json` with name `@repobench/<name>`
3. Add a `tsconfig.json` extending `../../tsconfig.base.json`
4. Add a reference in the root `tsconfig.json`
5. Run `pnpm install` to link
