/**
 * Database schema definition.
 * This file defines the SQL schema for the RepoBench database.
 * Used as a reference for migrations and data access layer.
 */

export const SCHEMA_VERSION = "001";

export const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS repositories (
  id            TEXT PRIMARY KEY,
  owner         TEXT NOT NULL,
  name          TEXT NOT NULL,
  full_name     TEXT NOT NULL UNIQUE,
  source        TEXT NOT NULL DEFAULT 'github',
  clone_url     TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  language      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_suites (
  id            TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL REFERENCES repositories(id),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  task_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  suite_id        TEXT NOT NULL REFERENCES benchmark_suites(id),
  repository_id   TEXT NOT NULL REFERENCES repositories(id),
  type            TEXT NOT NULL DEFAULT 'bugfix',
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  source_pr_number INTEGER NOT NULL,
  source_pr_url   TEXT NOT NULL,
  snapshot_data   JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  provider    TEXT NOT NULL,
  model       TEXT NOT NULL,
  execution_mode TEXT NOT NULL DEFAULT 'hosted',
  runtime_config JSONB NOT NULL DEFAULT '{"transport":"provider-api"}',
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'hosted';

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS runtime_config JSONB NOT NULL DEFAULT '{"transport":"provider-api"}';

UPDATE agent_profiles
SET
  execution_mode = 'local',
  runtime_config = '{"transport":"openai-compatible-http","baseUrl":"http://127.0.0.1:11434/v1"}'
WHERE
  provider = 'open-source'
  AND execution_mode = 'hosted'
  AND runtime_config = '{"transport":"provider-api"}';

CREATE TABLE IF NOT EXISTS runs (
  id               TEXT PRIMARY KEY,
  suite_id         TEXT NOT NULL REFERENCES benchmark_suites(id),
  agent_profile_id TEXT NOT NULL REFERENCES agent_profiles(id),
  status           TEXT NOT NULL DEFAULT 'queued',
  total_tasks      INTEGER NOT NULL DEFAULT 0,
  completed_tasks  INTEGER NOT NULL DEFAULT 0,
  passed_tasks     INTEGER NOT NULL DEFAULT 0,
  failed_tasks     INTEGER NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_attempts (
  id                TEXT PRIMARY KEY,
  run_id            TEXT NOT NULL REFERENCES runs(id),
  task_id           TEXT NOT NULL REFERENCES tasks(id),
  agent_profile_id  TEXT NOT NULL REFERENCES agent_profiles(id),
  attempt_number    INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'queued',
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  patch_artifact    TEXT,
  stdout_log        TEXT,
  stderr_log        TEXT,
  token_count       INTEGER,
  estimated_cost    NUMERIC(10, 6),
  duration_ms       INTEGER,
  error_message     TEXT
);

CREATE TABLE IF NOT EXISTS evaluation_verdicts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  TEXT NOT NULL REFERENCES run_attempts(id),
  task_id     TEXT NOT NULL REFERENCES tasks(id),
  run_id      TEXT NOT NULL REFERENCES runs(id),
  passed      BOOLEAN NOT NULL,
  metrics     JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_suite ON tasks(suite_id);
CREATE INDEX IF NOT EXISTS idx_runs_suite ON runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_run_attempts_run ON run_attempts(run_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_run_attempts_run_task_agent_attempt ON run_attempts(run_id, task_id, agent_profile_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_evaluation_verdicts_run ON evaluation_verdicts(run_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_verdicts_attempt ON evaluation_verdicts(attempt_id);
`;
