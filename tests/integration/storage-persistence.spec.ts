import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
    AgentProfile,
    BenchmarkSuite,
    Repository,
    Run,
    RunAttempt,
    Task,
} from "../../packages/domain/src/index.js";
import type { DatabaseConnection } from "../../packages/storage/src/index.js";
import {
    createAgentProfileStore,
    createDatabaseConnection,
    createEvaluationVerdictStore,
    createRepositoryStore,
    createRunAttemptStore,
    createRunStore,
    createSuiteStore,
    createTaskStore,
} from "../../packages/storage/src/index.js";

const databaseUrl = process.env["DATABASE_URL"];
const describeDatabaseIntegration =
    databaseUrl === undefined || databaseUrl.trim().length === 0 ? describe.skip : describe;

describeDatabaseIntegration("Storage persistence", () => {
    let db: DatabaseConnection | null = null;

    beforeAll(async () => {
        db = await createDatabaseConnection(databaseUrl as string);
    });

    beforeEach(async () => {
        if (db === null) {
            throw new Error("Database connection not initialized");
        }

        await db.sql.unsafe(`
TRUNCATE TABLE
  evaluation_verdicts,
  run_attempts,
  runs,
  tasks,
  benchmark_suites,
  repositories,
  agent_profiles
CASCADE
`);
    });

    afterAll(async () => {
        if (db !== null) {
            await db.close();
        }
    });

    it("round-trips run status, attempts, and evaluation verdicts through Postgres", async () => {
        if (db === null) {
            throw new Error("Database connection not initialized");
        }

        const repositoryStore = createRepositoryStore(db.sql);
        const suiteStore = createSuiteStore(db.sql);
        const taskStore = createTaskStore(db.sql);
        const runStore = createRunStore(db.sql);
        const runAttemptStore = createRunAttemptStore(db.sql);
        const evaluationVerdictStore = createEvaluationVerdictStore(db.sql);
        const agentProfileStore = createAgentProfileStore(db.sql);

        const repository: Repository = {
            id: "repo-storage-1",
            owner: "owner",
            name: "repo",
            fullName: "owner/repo",
            source: "github",
            cloneUrl: "https://github.com/owner/repo.git",
            defaultBranch: "main",
            language: "TypeScript",
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        };

        const suite: BenchmarkSuite = {
            id: "suite-storage-1",
            repositoryId: repository.id,
            name: "Persistence Suite",
            description: "Verifies Postgres-backed stores",
            taskCount: 1,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        };

        const task: Task = {
            id: "task-storage-1",
            suiteId: suite.id,
            repositoryId: repository.id,
            type: "bugfix",
            title: "Fix a failing benchmark task",
            description: "Persist benchmark metadata correctly",
            sourcePrNumber: 123,
            sourcePrUrl: "https://github.com/owner/repo/pull/123",
            snapshot: {
                baseCommitSha: "base-sha",
                headCommitSha: "head-sha",
                patchDiff: "diff --git a/file.ts b/file.ts",
                testCommand: "pnpm test",
                changedFiles: ["file.ts"],
            },
            status: "pending",
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
        };

        const agentProfile: AgentProfile = {
            id: "agent-storage-1",
            name: "Codex",
            provider: "codex",
            model: "gpt-4o",
            executionMode: "hosted",
            runtimeConfig: {
                transport: "provider-api",
            },
            config: { maxOutputTokens: 2048 },
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
        };

        const run: Run = {
            id: "run-storage-1",
            suiteId: suite.id,
            agentProfileId: agentProfile.id,
            status: "queued",
            totalTasks: 1,
            completedTasks: 0,
            passedTasks: 0,
            failedTasks: 0,
            startedAt: null,
            completedAt: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
        };

        const attempt: RunAttempt = {
            id: "attempt-storage-1",
            runId: run.id,
            taskId: task.id,
            agentProfileId: agentProfile.id,
            attemptNumber: 1,
            status: "running",
            startedAt: new Date("2024-01-01T00:01:00.000Z"),
            completedAt: null,
            patchArtifactPath: null,
            stdoutLogPath: null,
            stderrLogPath: null,
            tokenCount: null,
            estimatedCostUsd: null,
            durationMs: null,
            errorMessage: null,
        };

        await repositoryStore.create(repository);
        await suiteStore.create(suite);
        await taskStore.create(task);
        await agentProfileStore.create(agentProfile);
        await runStore.create(run);

        await runStore.updateStatus(run.id, "running", {
            completedTasks: 0,
            passedTasks: 0,
            failedTasks: 0,
        });

        const runningRun = await runStore.findById(run.id);
        expect(runningRun?.status).toBe("running");
        expect(runningRun?.startedAt).not.toBeNull();
        expect(runningRun?.completedAt).toBeNull();

        await runAttemptStore.create(attempt);
        await runAttemptStore.update(attempt.id, {
            status: "completed",
            completedAt: new Date("2024-01-01T00:02:00.000Z"),
            patchArtifactPath: "/tmp/patch.diff",
            stdoutLogPath: "/tmp/stdout.log",
            stderrLogPath: "/tmp/stderr.log",
            tokenCount: 111,
            estimatedCostUsd: 0.123456,
            durationMs: 60_000,
            errorMessage: null,
        });

        await evaluationVerdictStore.create({
            attemptId: attempt.id,
            taskId: task.id,
            runId: run.id,
            passed: true,
            metrics: {
                attemptId: attempt.id,
                taskId: task.id,
                runId: run.id,
                patchApplySuccess: true,
                buildSuccess: true,
                testSuccess: true,
                taskPass: true,
                durationMs: 60_000,
                tokenCount: 111,
                estimatedCostUsd: 0.123456,
                retryCount: 0,
                oneShot: true,
            },
            evaluatedAt: new Date("2024-01-01T00:02:01.000Z"),
        });

        await runStore.updateStatus(run.id, "completed", {
            completedTasks: 1,
            passedTasks: 1,
            failedTasks: 0,
        });

        const storedAttempts = await runAttemptStore.findByRun(run.id);
        expect(storedAttempts).toHaveLength(1);
        expect(storedAttempts[0]).toMatchObject({
            id: attempt.id,
            status: "completed",
            patchArtifactPath: "/tmp/patch.diff",
            stdoutLogPath: "/tmp/stdout.log",
            stderrLogPath: "/tmp/stderr.log",
            tokenCount: 111,
            estimatedCostUsd: 0.123456,
            durationMs: 60_000,
            errorMessage: null,
        });

        const storedVerdicts = await evaluationVerdictStore.findByRun(run.id);
        expect(storedVerdicts).toHaveLength(1);
        expect(storedVerdicts[0]).toMatchObject({
            attemptId: attempt.id,
            taskId: task.id,
            runId: run.id,
            passed: true,
            metrics: {
                taskPass: true,
                oneShot: true,
            },
        });

        const completedRun = await runStore.findById(run.id);
        expect(completedRun).toMatchObject({
            id: run.id,
            status: "completed",
            completedTasks: 1,
            passedTasks: 1,
            failedTasks: 0,
        });
        expect(completedRun?.startedAt).not.toBeNull();
        expect(completedRun?.completedAt).not.toBeNull();

        const storedAgentProfile = await agentProfileStore.findById(agentProfile.id);
        expect(storedAgentProfile).toMatchObject({
            id: agentProfile.id,
            executionMode: "hosted",
            runtimeConfig: {
                transport: "provider-api",
            },
        });
    });
});
