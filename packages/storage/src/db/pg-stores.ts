import type { Sql } from "postgres";
import type {
  AgentProfile,
  AgentRuntimeConfig,
  BenchmarkSuite,
  EvaluationVerdict,
  Repository,
  Run,
  RunAttempt,
  Task,
} from "@repobench/domain";
import { getDefaultExecutionModeForProvider, normalizeAgentRuntimeConfig } from "@repobench/agents";
import type {
  EvaluationVerdictStore,
  PaginationParams,
  RepositoryStore,
  RunAttemptStore,
  SuiteStore,
  TaskStore,
  RunStore,
  AgentProfileStore,
} from "./repositories.js";

const DEFAULT_PAGE_LIMIT = 100;

// Row-to-domain mappers

function toRepository(row: Record<string, unknown>): Repository {
  return {
    id: row["id"] as string,
    owner: row["owner"] as string,
    name: row["name"] as string,
    fullName: row["full_name"] as string,
    source: row["source"] as Repository["source"],
    cloneUrl: row["clone_url"] as string,
    defaultBranch: row["default_branch"] as string,
    language: (row["language"] as string | null) ?? null,
    createdAt: new Date(row["created_at"] as string),
    updatedAt: new Date(row["updated_at"] as string),
  };
}

function toSuite(row: Record<string, unknown>): BenchmarkSuite {
  return {
    id: row["id"] as string,
    repositoryId: row["repository_id"] as string,
    name: row["name"] as string,
    description: row["description"] as string,
    taskCount: row["task_count"] as number,
    createdAt: new Date(row["created_at"] as string),
    updatedAt: new Date(row["updated_at"] as string),
  };
}

function parseJsonValue<T>(value: unknown, fieldName: string): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse JSON field ${fieldName}: ${message}`);
    }
  }

  return value as T;
}

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row["id"] as string,
    suiteId: row["suite_id"] as string,
    repositoryId: row["repository_id"] as string,
    type: row["type"] as Task["type"],
    title: row["title"] as string,
    description: row["description"] as string,
    sourcePrNumber: row["source_pr_number"] as number,
    sourcePrUrl: row["source_pr_url"] as string,
    snapshot: parseJsonValue<Task["snapshot"]>(row["snapshot_data"], "tasks.snapshot_data"),
    status: row["status"] as Task["status"],
    createdAt: new Date(row["created_at"] as string),
  };
}

function toRun(row: Record<string, unknown>): Run {
  return {
    id: row["id"] as string,
    suiteId: row["suite_id"] as string,
    agentProfileId: row["agent_profile_id"] as string,
    status: row["status"] as Run["status"],
    totalTasks: row["total_tasks"] as number,
    completedTasks: row["completed_tasks"] as number,
    passedTasks: row["passed_tasks"] as number,
    failedTasks: row["failed_tasks"] as number,
    startedAt: row["started_at"] !== null ? new Date(row["started_at"] as string) : null,
    completedAt: row["completed_at"] !== null ? new Date(row["completed_at"] as string) : null,
    createdAt: new Date(row["created_at"] as string),
  };
}

function toAgentProfile(row: Record<string, unknown>): AgentProfile {
  const provider = row["provider"] as AgentProfile["provider"];
  const storedExecutionMode = row["execution_mode"] as
    | AgentProfile["executionMode"]
    | null
    | undefined;
  const storedRuntimeConfig =
    row["runtime_config"] !== undefined
      ? parseJsonValue<AgentRuntimeConfig>(row["runtime_config"], "agent_profiles.runtime_config")
      : undefined;

  const shouldBackfillLegacyOpenSourceProfile =
    provider === "open-source" &&
    (storedExecutionMode === undefined ||
      storedExecutionMode === null ||
      storedExecutionMode === "hosted") &&
    (storedRuntimeConfig === undefined ||
      (storedRuntimeConfig.transport === "provider-api" &&
        storedRuntimeConfig.apiKeyEnvVar === undefined));

  const executionMode = shouldBackfillLegacyOpenSourceProfile
    ? "local"
    : (storedExecutionMode ?? getDefaultExecutionModeForProvider(provider));

  return {
    id: row["id"] as string,
    name: row["name"] as string,
    provider,
    model: row["model"] as string,
    executionMode,
    runtimeConfig: normalizeAgentRuntimeConfig(
      provider,
      executionMode,
      shouldBackfillLegacyOpenSourceProfile ? undefined : storedRuntimeConfig,
    ),
    config: parseJsonValue<Record<string, unknown>>(row["config"], "agent_profiles.config"),
    createdAt: new Date(row["created_at"] as string),
  };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value);
  }

  throw new Error(`Expected a numeric database value, received: ${String(value)}`);
}

function toRunAttempt(row: Record<string, unknown>): RunAttempt {
  return {
    id: row["id"] as string,
    runId: row["run_id"] as string,
    taskId: row["task_id"] as string,
    agentProfileId: row["agent_profile_id"] as string,
    attemptNumber: row["attempt_number"] as number,
    status: row["status"] as RunAttempt["status"],
    startedAt: row["started_at"] !== null ? new Date(row["started_at"] as string) : null,
    completedAt: row["completed_at"] !== null ? new Date(row["completed_at"] as string) : null,
    patchArtifactPath: (row["patch_artifact"] as string | null) ?? null,
    stdoutLogPath: (row["stdout_log"] as string | null) ?? null,
    stderrLogPath: (row["stderr_log"] as string | null) ?? null,
    tokenCount: (row["token_count"] as number | null) ?? null,
    estimatedCostUsd: toNullableNumber(row["estimated_cost"]),
    durationMs: (row["duration_ms"] as number | null) ?? null,
    errorMessage: (row["error_message"] as string | null) ?? null,
  };
}

function toEvaluationVerdict(row: Record<string, unknown>): EvaluationVerdict {
  return {
    attemptId: row["attempt_id"] as string,
    taskId: row["task_id"] as string,
    runId: row["run_id"] as string,
    passed: row["passed"] as boolean,
    metrics: parseJsonValue<EvaluationVerdict["metrics"]>(
      row["metrics"],
      "evaluation_verdicts.metrics",
    ),
    evaluatedAt: new Date(row["evaluated_at"] as string),
  };
}

// Store factory functions

export function createRepositoryStore(sql: Sql): RepositoryStore {
  return {
    async findById(id: string): Promise<Repository | null> {
      const rows = await sql`SELECT * FROM repositories WHERE id = ${id}`;
      return rows.length > 0 ? toRepository(rows[0] as Record<string, unknown>) : null;
    },

    async findByFullName(fullName: string): Promise<Repository | null> {
      const rows = await sql`SELECT * FROM repositories WHERE full_name = ${fullName}`;
      return rows.length > 0 ? toRepository(rows[0] as Record<string, unknown>) : null;
    },

    async create(repo: Repository): Promise<Repository> {
      const rows = await sql`
        INSERT INTO repositories (id, owner, name, full_name, source, clone_url, default_branch, language)
        VALUES (${repo.id}, ${repo.owner}, ${repo.name}, ${repo.fullName}, ${repo.source}, ${repo.cloneUrl}, ${repo.defaultBranch}, ${repo.language})
        RETURNING *
      `;
      return toRepository(rows[0] as Record<string, unknown>);
    },

    async listAll(pagination?: PaginationParams): Promise<ReadonlyArray<Repository>> {
      const limit = pagination?.limit ?? DEFAULT_PAGE_LIMIT;
      const offset = pagination?.offset ?? 0;
      const rows =
        await sql`SELECT * FROM repositories ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      return rows.map((r) => toRepository(r as Record<string, unknown>));
    },
  };
}

export function createSuiteStore(sql: Sql): SuiteStore {
  return {
    async findById(id: string): Promise<BenchmarkSuite | null> {
      const rows = await sql`SELECT * FROM benchmark_suites WHERE id = ${id}`;
      return rows.length > 0 ? toSuite(rows[0] as Record<string, unknown>) : null;
    },

    async findByRepository(
      repositoryId: string,
      pagination?: PaginationParams,
    ): Promise<ReadonlyArray<BenchmarkSuite>> {
      const limit = pagination?.limit ?? DEFAULT_PAGE_LIMIT;
      const offset = pagination?.offset ?? 0;
      const rows =
        await sql`SELECT * FROM benchmark_suites WHERE repository_id = ${repositoryId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      return rows.map((r) => toSuite(r as Record<string, unknown>));
    },

    async create(suite: BenchmarkSuite): Promise<BenchmarkSuite> {
      const rows = await sql`
        INSERT INTO benchmark_suites (id, repository_id, name, description, task_count)
        VALUES (${suite.id}, ${suite.repositoryId}, ${suite.name}, ${suite.description}, ${suite.taskCount})
        RETURNING *
      `;
      return toSuite(rows[0] as Record<string, unknown>);
    },

    async deleteById(id: string): Promise<void> {
      await sql`DELETE FROM benchmark_suites WHERE id = ${id}`;
    },
  };
}

export function createTaskStore(sql: Sql): TaskStore {
  return {
    async findById(id: string): Promise<Task | null> {
      const rows = await sql`SELECT * FROM tasks WHERE id = ${id}`;
      return rows.length > 0 ? toTask(rows[0] as Record<string, unknown>) : null;
    },

    async findBySuite(suiteId: string): Promise<ReadonlyArray<Task>> {
      const rows = await sql`SELECT * FROM tasks WHERE suite_id = ${suiteId} ORDER BY created_at`;
      return rows.map((r) => toTask(r as Record<string, unknown>));
    },

    async create(task: Task): Promise<Task> {
      const rows = await sql`
        INSERT INTO tasks (id, suite_id, repository_id, type, title, description, source_pr_number, source_pr_url, snapshot_data, status)
        VALUES (${task.id}, ${task.suiteId}, ${task.repositoryId}, ${task.type}, ${task.title}, ${task.description}, ${task.sourcePrNumber}, ${task.sourcePrUrl}, ${sql.json(task.snapshot)}, ${task.status})
        RETURNING *
      `;
      return toTask(rows[0] as Record<string, unknown>);
    },

    async createMany(tasks: ReadonlyArray<Task>): Promise<number> {
      if (tasks.length === 0) {
        return 0;
      }
      const values = tasks.map((t) => ({
        id: t.id,
        suite_id: t.suiteId,
        repository_id: t.repositoryId,
        type: t.type,
        title: t.title,
        description: t.description,
        source_pr_number: t.sourcePrNumber,
        source_pr_url: t.sourcePrUrl,
        snapshot_data: sql.json(t.snapshot),
        status: t.status,
      }));
      const result = await sql`INSERT INTO tasks ${sql(values)}`;
      return result.count;
    },
  };
}

export function createRunStore(sql: Sql): RunStore {
  return {
    async findById(id: string): Promise<Run | null> {
      const rows = await sql`SELECT * FROM runs WHERE id = ${id}`;
      return rows.length > 0 ? toRun(rows[0] as Record<string, unknown>) : null;
    },

    async findBySuite(suiteId: string, pagination?: PaginationParams): Promise<ReadonlyArray<Run>> {
      const limit = pagination?.limit ?? DEFAULT_PAGE_LIMIT;
      const offset = pagination?.offset ?? 0;
      const rows =
        await sql`SELECT * FROM runs WHERE suite_id = ${suiteId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      return rows.map((r) => toRun(r as Record<string, unknown>));
    },

    async create(run: Run): Promise<Run> {
      const rows = await sql`
        INSERT INTO runs (id, suite_id, agent_profile_id, status, total_tasks, completed_tasks, passed_tasks, failed_tasks, started_at, completed_at)
        VALUES (${run.id}, ${run.suiteId}, ${run.agentProfileId}, ${run.status}, ${run.totalTasks}, ${run.completedTasks}, ${run.passedTasks}, ${run.failedTasks}, ${run.startedAt}, ${run.completedAt})
        RETURNING *
      `;
      return toRun(rows[0] as Record<string, unknown>);
    },

    async updateStatus(
      id: string,
      status: Run["status"],
      counts: { completedTasks: number; passedTasks: number; failedTasks: number },
    ): Promise<void> {
      const completedAt = status === "completed" || status === "failed" ? new Date() : null;
      await sql`
        UPDATE runs SET
          status = ${status},
          completed_tasks = ${counts.completedTasks},
          passed_tasks = ${counts.passedTasks},
          failed_tasks = ${counts.failedTasks},
                    started_at = CASE
                        WHEN ${status} = 'running' THEN COALESCE(started_at, NOW())
                        ELSE started_at
                    END,
          completed_at = ${completedAt}
        WHERE id = ${id}
      `;
    },
  };
}

export function createRunAttemptStore(sql: Sql): RunAttemptStore {
  return {
    async findByRun(runId: string): Promise<ReadonlyArray<RunAttempt>> {
      const rows = await sql`
                SELECT * FROM run_attempts
                WHERE run_id = ${runId}
                ORDER BY started_at ASC NULLS FIRST, attempt_number ASC
            `;
      return rows.map((row) => toRunAttempt(row as Record<string, unknown>));
    },

    async create(attempt: RunAttempt): Promise<RunAttempt> {
      const rows = await sql`
                INSERT INTO run_attempts (
                    id,
                    run_id,
                    task_id,
                    agent_profile_id,
                    attempt_number,
                    status,
                    started_at,
                    completed_at,
                    patch_artifact,
                    stdout_log,
                    stderr_log,
                    token_count,
                    estimated_cost,
                    duration_ms,
                    error_message
                )
                VALUES (
                    ${attempt.id},
                    ${attempt.runId},
                    ${attempt.taskId},
                    ${attempt.agentProfileId},
                    ${attempt.attemptNumber},
                    ${attempt.status},
                    ${attempt.startedAt},
                    ${attempt.completedAt},
                    ${attempt.patchArtifactPath},
                    ${attempt.stdoutLogPath},
                    ${attempt.stderrLogPath},
                    ${attempt.tokenCount},
                    ${attempt.estimatedCostUsd},
                    ${attempt.durationMs},
                    ${attempt.errorMessage}
                )
                RETURNING *
            `;
      return toRunAttempt(rows[0] as Record<string, unknown>);
    },

    async update(
      id: string,
      input: {
        status: RunAttempt["status"];
        completedAt: Date | null;
        patchArtifactPath: string | null;
        stdoutLogPath: string | null;
        stderrLogPath: string | null;
        tokenCount: number | null;
        estimatedCostUsd: number | null;
        durationMs: number | null;
        errorMessage: string | null;
      },
    ): Promise<void> {
      await sql`
                UPDATE run_attempts SET
                    status = ${input.status},
                    completed_at = ${input.completedAt},
                    patch_artifact = ${input.patchArtifactPath},
                    stdout_log = ${input.stdoutLogPath},
                    stderr_log = ${input.stderrLogPath},
                    token_count = ${input.tokenCount},
                    estimated_cost = ${input.estimatedCostUsd},
                    duration_ms = ${input.durationMs},
                    error_message = ${input.errorMessage}
                WHERE id = ${id}
            `;
    },
  };
}

export function createEvaluationVerdictStore(sql: Sql): EvaluationVerdictStore {
  return {
    async findByRun(runId: string): Promise<ReadonlyArray<EvaluationVerdict>> {
      const rows = await sql`
                SELECT attempt_id, task_id, run_id, passed, metrics, evaluated_at
                FROM evaluation_verdicts
                WHERE run_id = ${runId}
                ORDER BY evaluated_at ASC
            `;
      return rows.map((row) => toEvaluationVerdict(row as Record<string, unknown>));
    },

    async create(verdict: EvaluationVerdict): Promise<EvaluationVerdict> {
      const rows = await sql`
                INSERT INTO evaluation_verdicts (attempt_id, task_id, run_id, passed, metrics, evaluated_at)
                VALUES (
                    ${verdict.attemptId},
                    ${verdict.taskId},
                    ${verdict.runId},
                    ${verdict.passed},
                    ${sql.json(verdict.metrics)},
                    ${verdict.evaluatedAt}
                )
                RETURNING attempt_id, task_id, run_id, passed, metrics, evaluated_at
            `;
      return toEvaluationVerdict(rows[0] as Record<string, unknown>);
    },
  };
}

export function createAgentProfileStore(sql: Sql): AgentProfileStore {
  return {
    async findById(id: string): Promise<AgentProfile | null> {
      const rows = await sql`SELECT * FROM agent_profiles WHERE id = ${id}`;
      return rows.length > 0 ? toAgentProfile(rows[0] as Record<string, unknown>) : null;
    },

    async findByProvider(provider: AgentProfile["provider"]): Promise<ReadonlyArray<AgentProfile>> {
      const rows =
        await sql`SELECT * FROM agent_profiles WHERE provider = ${provider} ORDER BY created_at DESC`;
      return rows.map((r) => toAgentProfile(r as Record<string, unknown>));
    },

    async create(profile: AgentProfile): Promise<AgentProfile> {
      const rows = await sql`
        INSERT INTO agent_profiles (id, name, provider, model, execution_mode, runtime_config, config)
        VALUES (${profile.id}, ${profile.name}, ${profile.provider}, ${profile.model}, ${profile.executionMode}, ${sql.json(profile.runtimeConfig as Parameters<Sql["json"]>[0])}, ${sql.json(profile.config as Parameters<Sql["json"]>[0])})
        RETURNING *
      `;
      return toAgentProfile(rows[0] as Record<string, unknown>);
    },

    async listAll(pagination?: PaginationParams): Promise<ReadonlyArray<AgentProfile>> {
      const limit = pagination?.limit ?? DEFAULT_PAGE_LIMIT;
      const offset = pagination?.offset ?? 0;
      const rows =
        await sql`SELECT * FROM agent_profiles ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      return rows.map((r) => toAgentProfile(r as Record<string, unknown>));
    },
  };
}
