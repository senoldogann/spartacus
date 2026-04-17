# Data Handling

## Data Classification

| Data Type                  | Classification | Handling                                                                                               |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| Source code (cloned repos) | Confidential   | Ephemeral on disk; selected task context may be sent to hosted model APIs only when explicitly enabled |
| PR diffs                   | Internal       | Stored in task snapshots (Postgres JSONB)                                                              |
| Agent output patches       | Internal       | Stored in artifact store                                                                               |
| Stdout/stderr logs         | Internal       | Scrubbed then stored                                                                                   |
| GitHub tokens              | Secret         | Environment variables only, never logged                                                               |
| Agent API keys             | Secret         | Environment variables only, never logged                                                               |

## Log Masking

All log output is scrubbed before storage using patterns for:

- GitHub tokens (`ghp_`, `gho_`, `github_pat_`)
- API keys (`sk-`, `key-`)
- Bearer tokens
- Base64-encoded credentials
- URLs with embedded credentials

## Retention

| Data                           | Default Retention   | Configurable |
| ------------------------------ | ------------------- | ------------ |
| Metadata (repos, suites, runs) | Indefinite          | No           |
| Task snapshots                 | Indefinite          | No           |
| Artifacts (patches, logs)      | 90 days             | Yes          |
| Evaluation verdicts            | 1 year              | Yes          |
| Ephemeral workspaces           | Deleted immediately | No           |

## Data Deletion

Users can delete:

- Individual runs and their artifacts
- Entire suites and associated tasks
- Repository connections and all related data

Deletion is hard-delete (not soft-delete) for compliance.
