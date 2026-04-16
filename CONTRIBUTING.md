# Contributing to RepoBench

Thank you for your interest in contributing. This document covers the process for contributing to this repository.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Start local infrastructure: `pnpm docker:up`
4. Build: `pnpm build`
5. Run tests: `pnpm test`

See [DEVELOPERS.md](DEVELOPERS.md) for detailed setup instructions.

## Branch Strategy

- `main` — stable, release-ready code
- `dev` — integration branch for upcoming release
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(repo-ingest): add GitLab adapter
fix(sandbox): handle Docker timeout on slow networks
docs(readme): update quick start section
test(evaluator): add patch apply edge cases
chore(deps): bump typescript to 5.7
```

## Pull Request Process

1. Create a feature branch from `dev`
2. Make your changes with clear, focused commits
3. Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test`
4. Open a PR against `dev` using the PR template
5. Address review feedback
6. A maintainer will merge once approved

## Code Standards

- TypeScript strict mode — no `any` types
- Pure functions preferred over stateful classes
- All public functions must have explicit return types
- Imports at the top of the file
- No default parameter values

## Testing

- Unit tests live next to source files as `*.test.ts`
- Integration tests go in `tests/integration/`
- E2E tests go in `tests/e2e/`
- Run relevant tests before submitting a PR

## Reporting Issues

Use the issue templates in `.github/ISSUE_TEMPLATE/` for bug reports and feature requests.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
