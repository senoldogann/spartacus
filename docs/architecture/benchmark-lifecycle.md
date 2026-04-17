# Benchmark Lifecycle

## Overview

```
Connect Repo → Import PRs → Filter → Build Tasks → Create Suite
                                                        │
                                                        ▼
                                              Start Run (queue)
                                                        │
                                                        ▼
                                              Worker picks job
                                                        │
                                              ┌─────────┴──────────┐
                                              │  For each task:         │
                                              │  1. Clone base snapshot │
                                              │  2. Run agent           │
                                              │  3. Sandbox apply patch │
                                              │  4. Sandbox verify      │
                                              │  5. Score               │
                                              │  6. Store results       │
                                              │  7. Cleanup             │
                                              └─────────┬──────────┘
                                                        │
                                                        ▼
                                              Run complete
                                                        │
                                                        ▼
                                              Report / Compare
```

## Phase 1: Import

1. User connects a GitHub repository via CLI or API
2. Repo Ingest fetches merged PRs from GitHub API (paginated)
3. Task Builder filters candidates (bugfix PRs, reasonable size)
4. For each candidate, a TaskSnapshot is created (base commit, diff, test command)
5. Tasks are saved to a BenchmarkSuite in Postgres

## Phase 2: Execute

1. User starts a run specifying a suite and agent profile
2. Run is queued in Redis via BullMQ
3. Worker picks up the job
4. For each task in the suite:
   - Clone the base commit into an ephemeral workspace
   - Invoke the configured agent execution lane:
     - hosted provider API (explicit opt-in, off-box)
     - local OpenAI-compatible endpoint (on-box)
   - Capture agent output (patch, stdout, stderr, tokens)
   - Apply the patch inside Docker
   - Run the verification command inside Docker
   - Score with deterministic evaluator
   - Store verdict and artifacts

## Phase 3: Report

1. User requests report via CLI, API, or dashboard
2. System aggregates EvaluationVerdicts for the run
3. Metrics computed: task pass rate, one-shot rate, avg cost, avg duration
4. Compare mode shows two runs side-by-side with per-task diff
