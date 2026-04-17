# Contributing to RepoBench

Thank you for your interest in contributing. This document covers the process for contributing to this repository.

## Before You Start

- For security issues, do not open a public issue or PR. Follow [SECURITY.md](SECURITY.md).
- For general questions or coordination, contact **Senol Dogan** at **contact@senoldogan.dev**.
- Project website: **https://www.senoldogan.dev**

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Start local infrastructure: `pnpm docker:up`
4. If you changed Dockerfiles or container build inputs, rebuild with `docker compose up -d --build`
5. Build: `pnpm build`
6. Run tests: `pnpm test`

See [DEVELOPERS.md](DEVELOPERS.md) for detailed setup instructions.

## Branch Strategy

- `main` — stable branch and the default pull request target
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`
- Documentation updates: `docs/<short-description>`
- Maintenance work: `chore/<short-description>`

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

1. Create a focused branch from `main`
2. Make your changes with clear, focused commits
3. Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test`
4. If you changed Docker, runtime behavior, or the dashboard flow, also run the relevant validation such as `pnpm build`, `pnpm test:e2e`, or `docker compose up -d --build`
5. Open a PR against `main` using the PR template
6. Link the issue or explain the motivation clearly in the PR description
7. Address review feedback
8. A maintainer will merge once approved

## Code Standards

- TypeScript strict mode — no `any` types
- Pure functions preferred over stateful classes
- All public functions must have explicit return types
- Imports at the top of the file
- No default parameter values
- Comments in English only

## Testing

- Prefer integration and end-to-end coverage for behavior changes
- Keep unit tests focused on stable pure transformations when they add clear value
- Integration tests go in `tests/integration/`
- E2E tests go in `tests/e2e/`
- Run the smallest relevant validation set before submitting a PR, and use the full check set for broader changes

## Reporting Issues

Use the issue templates in `.github/ISSUE_TEMPLATE/` for bug reports and feature requests.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
