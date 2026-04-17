# System Overview

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interfaces                           │
│  ┌──────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │   CLI    │  │  REST API      │  │  Web Dashboard      │  │
│  │ (Node)   │  │  (Fastify)     │  │  (Next.js)          │  │
│  └────┬─────┘  └───────┬────────┘  └──────────┬──────────┘  │
├───────┴────────────────┴───────────────────────┴────────────┤
│                     Core Engine                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Repo Ingest  │ │ Task Builder │ │   Agent Adapters     │ │
│  │ (GitHub API) │ │ (PR→Task)    │ │ (Claude/Codex/OSS)   │ │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘ │
│         │                │                     │             │
│  ┌──────┴────────────────┴─────────────────────┴───────────┐│
│  │                    Sandbox (Docker)                      ││
│  │  ephemeral workspace · network isolation · timeout       ││
│  └─────────────────────────┬───────────────────────────────┘│
│                            │                                 │
│  ┌─────────────────────────┴───────────────────────────────┐│
│  │              Evaluator (Deterministic)                   ││
│  │  patch apply · build · test · score · verdict            ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                     Infrastructure                           │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐ │
│  │ PostgreSQL │ │   Redis    │ │ Local Artifact Directory │ │
│  │ (metadata) │ │ (queue)    │ │   (patches/logs)         │ │
│  └────────────┘ └────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component      | Package                   | Responsibility                                  |
| -------------- | ------------------------- | ----------------------------------------------- |
| Domain         | `@repobench/domain`       | Shared types, entities, and contracts           |
| Repo Ingest    | `@repobench/repo-ingest`  | Fetch repo metadata, PRs, diffs from GitHub API |
| Task Builder   | `@repobench/task-builder` | Filter PR candidates, build benchmark tasks     |
| Agent Adapters | `@repobench/agents`       | Invoke coding agents via their APIs             |
| Sandbox        | `@repobench/sandbox`      | Docker-based isolated execution                 |
| Evaluator      | `@repobench/evaluator`    | Apply patches, run tests, produce scores        |
| Storage        | `@repobench/storage`      | Postgres schema, data access, local artifacts   |
| Worker         | `@repobench/worker`       | Background job processor (BullMQ)               |
| API            | `@repobench/api`          | REST API for all operations                     |
| CLI            | `@repobench/cli`          | Command-line interface                          |
| Web            | `@repobench/web`          | Next.js dashboard                               |
| UI             | `@repobench/ui`           | Shared React components                         |

## Data Flow

1. **Import**: CLI/API → Repo Ingest → Task Builder → Storage
2. **Run**: CLI/API → Queue (Redis) → Worker → Agent → Sandbox verifier → Evaluator → Storage
3. **Report**: CLI/API/Dashboard → Storage → Formatted output
