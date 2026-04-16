# Data Model

## Entity Relationships

```
Repository 1──* BenchmarkSuite 1──* Task
                                      │
AgentProfile 1──* Run 1──* RunAttempt ─┘
                              │
                    EvaluationVerdict
```

## Core Entities

### Repository
Source code repository tracked by RepoBench. Connected via GitHub API.

### BenchmarkSuite
A named collection of tasks derived from a repository's PR history. Immutable once created.

### Task
A single benchmark challenge. Contains a frozen snapshot (base commit, expected patch, test command) derived from a merged PR.

### AgentProfile
Configuration for a coding agent: provider (Claude/Codex/OSS), model version, and runtime parameters.

### Run
Execution of a suite with a specific agent profile. Tracks overall progress and status.

### RunAttempt
A single attempt by an agent on a specific task. Captures patch output, logs, tokens, cost, and duration.

### EvaluationVerdict
Deterministic scoring result for a run attempt. Contains all computed metrics.

## Storage Mapping

| Entity | Primary Store | Notes |
|---|---|---|
| Repository | Postgres | Metadata only |
| BenchmarkSuite | Postgres | Metadata + task count |
| Task | Postgres | Snapshot stored as JSONB |
| AgentProfile | Postgres | Config stored as JSONB |
| Run | Postgres | Status updated during execution |
| RunAttempt | Postgres | Log paths reference artifact store |
| EvaluationVerdict | Postgres | Metrics stored as JSONB |
| Patches, Logs | S3-compatible | Keyed by run/task/attempt |
