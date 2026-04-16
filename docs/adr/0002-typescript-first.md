# ADR-0002: TypeScript-First

## Status

Accepted

## Context

RepoBench includes a web dashboard (React/Next.js), REST API, CLI, and multiple packages. We need a primary programming language.

## Decision

TypeScript for all components. Strict mode enabled (`strict: true`, `noUncheckedIndexedAccess`, etc.).

## Rationale

- **Full-stack consistency**: Same language for frontend, backend, CLI, and shared packages.
- **Type safety**: Domain types are shared across all packages with compile-time guarantees.
- **Ecosystem**: Rich npm ecosystem for GitHub API, Docker, queue management, testing.
- **Developer experience**: TypeScript is the most common language among our target users (AI platform engineers).

## Alternatives Considered

- **Go**: Better for CLI and worker performance, but splits the stack and loses type sharing with the web dashboard.
- **Python**: Strong in ML/AI ecosystem but weaker for web frontends and requires separate tooling.
- **Rust**: Excellent performance but higher development cost for web-facing components.

## Consequences

- All packages use `tsconfig.base.json` for consistent compiler options.
- `verbatimModuleSyntax` is enabled — imports must use `import type` for type-only imports.
- ESLint with `typescript-eslint` enforces no-any and explicit return types.
