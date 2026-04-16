# ADR-0004: GitHub-First Integration

## Status

Accepted

## Context

RepoBench needs to import code history from source control systems. Multiple platforms exist: GitHub, GitLab, Bitbucket, Azure DevOps.

## Decision

Support GitHub exclusively in v1. Design adapter interfaces to enable GitLab and others post-v1.

## Rationale

- **Market share**: GitHub hosts the majority of OSS and a large share of enterprise repositories.
- **API quality**: GitHub REST API is well-documented with consistent pagination and diff support.
- **Validation**: Public GitHub repos provide the best launch validation opportunity.
- **Scope control**: Supporting multiple platforms from day one delays core engine development.

## Alternatives Considered

- **Multi-platform from day one**: Rejected — doubles the integration surface before core value is proven.
- **GitLab-first**: Smaller addressable market for initial validation.
- **Git-only (no platform API)**: Would miss PR metadata needed for task construction.

## Consequences

- `@repobench/repo-ingest` has a GitHub-specific implementation with a clean adapter boundary.
- Adding GitLab requires implementing the same adapter interface — no core engine changes.
- v1 marketing must be clear about GitHub-only support.
- CLI `--source` flag defaults to `github` but accepts other values for forward compatibility.
