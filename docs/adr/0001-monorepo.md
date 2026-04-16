# ADR-0001: Monorepo with pnpm + Turborepo

## Status

Accepted

## Context

RepoBench consists of multiple applications (API, CLI, web dashboard), a worker service, and several shared packages (domain types, repo ingest, evaluator, etc.). We need a strategy for organizing and building these components.

## Decision

Use a pnpm workspace monorepo with Turborepo for build orchestration.

## Rationale

- **Code sharing**: Domain types, utilities, and configurations are shared across all components without publishing to npm.
- **Atomic changes**: A single PR can update a domain type and all consumers.
- **Build caching**: Turborepo provides content-hash-based caching, skipping unchanged packages.
- **pnpm efficiency**: Strict dependency resolution and disk-space-efficient node_modules via symlinks.

## Alternatives Considered

- **Polyrepo**: Rejected — too much overhead for a small team; cross-package changes require multiple PRs.
- **Nx**: Viable but heavier; Turborepo is simpler for our needs.
- **npm/yarn workspaces**: pnpm's strictness prevents phantom dependencies.

## Consequences

- All packages must use `workspace:*` protocol for internal dependencies.
- CI must install all dependencies even for partial changes.
- Turborepo pipeline in `turbo.json` must be maintained as packages are added.
