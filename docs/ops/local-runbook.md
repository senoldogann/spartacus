# Local Development Runbook

## Fastest Product Trial

Use this when you want to try the product as a local deployment without running source files directly.

```bash
# 1. Clone repository
git clone https://github.com/senoldogann/spartacus.git
cd spartacus

# 2. Set up environment
cp .env.example .env
# Edit .env with your GitHub token, API auth token, and provider credentials if you want real runs

# 3. Start the full local stack
docker compose up -d --build

# 4. Wait for services to be healthy
docker compose ps  # postgres, redis, minio, and api should show healthy; web should be up
```

Then open `http://localhost:3000`.

## Source Development Setup

```bash
# 1. Clone repository
git clone https://github.com/senoldogann/spartacus.git
cd spartacus

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your GitHub token, API auth token, and provider credentials if you want real runs

# 4. Start dependency services only
docker compose up -d postgres redis minio

# 5. Install and build the workspace
pnpm install
pnpm build

# 6. Start source-based dev servers
pnpm dev

# 7. Verify
pnpm test
pnpm typecheck
```

The API applies the current schema automatically on startup. The current `pnpm db:migrate` command is a placeholder and is not required for normal local setup.

## Daily Development

```bash
# Start only the dependency services
docker compose up -d postgres redis minio

# Start all dev servers (API, web, worker)
pnpm dev

# Run specific package in dev mode
pnpm --filter @repobench/api dev
pnpm --filter @repobench/web dev
```

## Troubleshooting

### Postgres won't start

```bash
docker compose down -v  # Remove volumes
docker compose up -d --build
```

### Port conflicts

Check for existing services on ports 3000, 3001, 5432, 6379, 9000.

### Build errors after pulling

```bash
pnpm clean
pnpm install
pnpm build
```
