# Changelog

## 0.1.0

- Added a browser-based setup flow at `/setup` for creating agent profiles, repositories, benchmark suites, and runs.
- Stabilized the Docker-first local product path and aligned onboarding docs with the actual runtime behavior.
- Removed GitHub Actions dependence on deprecated Node 20-based pnpm action runtimes and standardized workflows on Corepack + Node 22.
- Prepared the initial public release workflow with versioned release notes and a release runbook aligned to the automated tag flow.# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project scaffold with monorepo structure
- Domain types for Repository, Task, Run, and Metric entities
- GitHub PR import pipeline stub
- Docker-based sandbox execution stub
- Deterministic evaluator stub
- Fastify API server skeleton
- CLI skeleton with init, import, run, report, and compare commands
- Next.js dashboard skeleton
- BullMQ worker service skeleton
