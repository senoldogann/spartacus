# Product Brief

## What is RepoBench?

RepoBench is an open-source platform that benchmarks coding agents on your team's own repository history. Instead of relying on generic public benchmarks (SWE-bench, HumanEval), RepoBench replays your actual merged PRs and closed issues as reproducible tasks, runs agents in sandboxed environments, and produces deterministic, comparable scores.

## Target Users

- **AI Platform Engineers** evaluating which coding agent to adopt
- **Engineering Managers** making build-vs-buy decisions for AI tooling
- **Staff Engineers** standardizing agent usage across teams
- **Platform Teams** operating coding agents at scale

## Problem

Teams cannot objectively compare coding agents on their own codebase. Public benchmarks use synthetic datasets that don't reflect real-world stack complexity, coding conventions, or dependency landscapes. Agent vendor claims are unverifiable on private code.

## Solution

1. Connect your GitHub repository
2. Import merged PRs as benchmark tasks (starting with bugfix PRs)
3. Run multiple agents on identical task sets in isolated sandboxes
4. Compare results with deterministic metrics: patch apply, build, test pass, cost, speed

## Scope

### In Scope (v1)
- GitHub repository ingestion
- Merged bugfix PR replay
- Docker-based sandboxed execution
- Claude, Codex, and open-source model adapters
- Deterministic metrics (no LLM judge)
- CLI and REST API
- Web dashboard for results viewing

### Out of Scope
- General LLM leaderboard
- Observability/monitoring platform
- Code review bot
- Live pair-programming assistant
- GitLab/Jira integration (post-v1)
- LLM-as-judge evaluation (post-v1)
