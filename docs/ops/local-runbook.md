# Local Development Runbook

## First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/repobench/repobench.git
cd repobench

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your GitHub token

# 4. Start infrastructure
pnpm docker:up

# 5. Wait for services to be healthy
docker compose ps  # All services should show "healthy"

# 6. Run database migrations
pnpm db:migrate

# 7. Build all packages
pnpm build

# 8. Verify
pnpm test
pnpm typecheck
```

## Daily Development

```bash
# Start infrastructure if not running
pnpm docker:up

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
pnpm docker:up          # Restart fresh
```

### Port conflicts
Check for existing services on ports 3000, 3001, 5432, 6379, 9000.

### Build errors after pulling
```bash
pnpm clean
pnpm install
pnpm build
```
