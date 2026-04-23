# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 – base: Node 20 + pnpm
# ──────────────────────────────────────────────────────────────────────────────
FROM node:25-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 – deps: install all workspace dependencies
# Only package manifests are copied here so that this layer is cached as long
# as the lockfile and package.json files do not change.
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./

COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/
COPY apps/cli/package.json         apps/cli/
COPY services/worker/package.json  services/worker/

COPY packages/agents/package.json       packages/agents/
COPY packages/domain/package.json       packages/domain/
COPY packages/evaluator/package.json    packages/evaluator/
COPY packages/repo-ingest/package.json  packages/repo-ingest/
COPY packages/sandbox/package.json      packages/sandbox/
COPY packages/storage/package.json      packages/storage/
COPY packages/task-builder/package.json packages/task-builder/
COPY packages/ui/package.json           packages/ui/

RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 – builder: compile TypeScript for all packages
# ──────────────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /repo
COPY . .

# Build everything: workspace libs, api, worker, web (Next.js standalone).
# CLI is excluded — it is not needed at runtime.
RUN pnpm turbo run build --filter='!@repobench/cli'

# ──────────────────────────────────────────────────────────────────────────────
# Stage 4a – api-deploy: prune to production dependencies only
# pnpm deploy copies the package + all its prod deps (including workspace
# packages with their compiled dist/ folders) into a flat directory.
# ──────────────────────────────────────────────────────────────────────────────
FROM builder AS api-deploy
RUN pnpm --filter @repobench/api deploy --prod /deploy/api

# ──────────────────────────────────────────────────────────────────────────────
# Stage 4b – worker-deploy
# ──────────────────────────────────────────────────────────────────────────────
FROM builder AS worker-deploy
RUN pnpm --filter @repobench/worker deploy --prod /deploy/worker

# ──────────────────────────────────────────────────────────────────────────────
# Stage 5 – api: production runtime image
# ──────────────────────────────────────────────────────────────────────────────
FROM node:25-alpine AS api
WORKDIR /app

COPY --from=api-deploy /deploy/api .

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 6 – worker: production runtime image
# ──────────────────────────────────────────────────────────────────────────────
FROM node:25-alpine AS worker
WORKDIR /app

COPY --from=worker-deploy /deploy/worker .

ENV NODE_ENV=production
CMD ["node", "dist/worker.js"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 7 – web: Next.js standalone runtime image
# The standalone output contains a self-hosted server.js with its own
# node_modules, so no pnpm is needed in this stage.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:25-alpine AS web
WORKDIR /app

# Standalone bundle (server.js + inlined node_modules)
COPY --from=builder /repo/apps/web/.next/standalone ./
# Static assets must be placed beside the standalone server
COPY --from=builder /repo/apps/web/.next/static     apps/web/.next/static/
# public/ is optional — only present if the app has static assets

ENV NODE_ENV=production
# Tell Next.js standalone to listen on all interfaces
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
