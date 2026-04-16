# Storage Model

## Components

### PostgreSQL

Primary data store for all entities and metadata.

**Responsibilities**:
- Repository, Suite, Task, AgentProfile, Run, RunAttempt, EvaluationVerdict records
- Task snapshots stored as JSONB
- Evaluation metrics stored as JSONB
- Indexing for query performance (suite-level, run-level lookups)

**Connection**: Standard connection pool via `DATABASE_URL`.

### Redis

Job queue and caching layer.

**Responsibilities**:
- BullMQ job queue for benchmark runs
- Job progress tracking
- Temporary result caching

**Connection**: Via `REDIS_URL`.

### S3-Compatible Artifact Store

Binary and text artifact storage.

**Responsibilities**:
- Agent-generated patches
- Stdout/stderr logs from sandbox runs
- Test output logs
- Generated reports

**Key Structure**:
```
runs/<run-id>/tasks/<task-id>/attempts/<attempt-id>/patch.diff
runs/<run-id>/tasks/<task-id>/attempts/<attempt-id>/stdout.log
runs/<run-id>/tasks/<task-id>/attempts/<attempt-id>/stderr.log
runs/<run-id>/report.json
```

**Connection**: Via `ARTIFACT_STORE_ENDPOINT`, access key, secret key, bucket name.

## Retention Policy

| Data Type | Retention | Rationale |
|---|---|---|
| Repository metadata | Indefinite | Small, needed for context |
| Suite/Task definitions | Indefinite | Needed for re-runs |
| Run metadata | 1 year | Historical comparison |
| Artifacts (patches, logs) | 90 days | Storage cost control |
| Evaluation verdicts | 1 year | Trend analysis |
