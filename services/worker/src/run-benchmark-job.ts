import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { EvaluationVerdict, RunAttempt } from "@repobench/domain";
import { evaluatePatchInSandbox, scoreRun } from "@repobench/evaluator";
import {
  createAgentAdapterForProfile,
  getRequiredCredentialEnvVar,
  isHostedAgentProfile,
} from "@repobench/agents";
import type { AgentAdapter } from "@repobench/agents";
import {
  buildArtifactKey,
  createDatabaseConnection,
  createEvaluationVerdictStore,
  createRunAttemptStore,
  createRunStore,
  createTaskStore,
  createAgentProfileStore,
  createRepositoryStore,
  resolveLocalArtifactPath,
} from "@repobench/storage";

const execFileAsync = promisify(execFile);

/**
 * Input for a single benchmark job (serialized through BullMQ).
 */
export type BenchmarkJobInput = {
  readonly runId: string;
  readonly suiteId: string;
  readonly agentProfileId: string;
};

const TASK_TIMEOUT_MS = 120_000;
const SANDBOX_IMAGE = process.env["SANDBOX_DOCKER_IMAGE"] ?? "repobench/sandbox:latest";
const ARTIFACTS_ROOT = resolve(
  process.env["ARTIFACTS_DIR"] ?? join(process.cwd(), ".repobench-artifacts"),
);
const REDACTED_VALUE = "[REDACTED]";
const SECRET_ENV_VAR_NAMES = [
  "GITHUB_TOKEN",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "API_AUTH_TOKEN",
] as const;

type PersistedAttemptArtifacts = {
  readonly patchArtifactPath: string | null;
  readonly stdoutLogPath: string | null;
  readonly stderrLogPath: string | null;
};

function createCloneUrl(cloneUrl: string): string {
  const githubToken = process.env["GITHUB_TOKEN"];
  if (githubToken === undefined || githubToken.trim().length === 0) {
    return cloneUrl;
  }

  try {
    const parsedUrl = new URL(cloneUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com") {
      return cloneUrl;
    }

    parsedUrl.username = "x-access-token";
    parsedUrl.password = githubToken;
    return parsedUrl.toString();
  } catch {
    return cloneUrl;
  }
}

async function persistArtifact(artifactKey: string, content: string): Promise<string> {
  const artifactPath = resolveLocalArtifactPath(ARTIFACTS_ROOT, artifactKey);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, content, "utf8");
  return artifactKey;
}

async function persistAttemptArtifacts(
  runId: string,
  taskId: string,
  attemptId: string,
  patchContent: string,
  stdout: string,
  stderr: string,
): Promise<PersistedAttemptArtifacts> {
  const [patchArtifactPath, stdoutLogPath, stderrLogPath] = await Promise.all([
    persistArtifact(buildArtifactKey(runId, taskId, attemptId, "patch.diff"), patchContent),
    persistArtifact(buildArtifactKey(runId, taskId, attemptId, "stdout.log"), stdout),
    persistArtifact(buildArtifactKey(runId, taskId, attemptId, "stderr.log"), stderr),
  ]);

  return {
    patchArtifactPath,
    stdoutLogPath,
    stderrLogPath,
  };
}

function buildFailureMessage(prefix: string, details: string): string {
  return sanitizeText(`${prefix}: ${details}`.trim());
}

function isHostedExecutionAllowed(): boolean {
  return process.env["ALLOW_HOSTED_AGENT_EXECUTION"] === "true";
}

function redactCredentialedUrls(value: string): string {
  return value.replaceAll(/https:\/\/([^/\s:@]+):([^@\s]+)@/gu, `https://$1:${REDACTED_VALUE}@`);
}

function sanitizeText(value: string): string {
  return SECRET_ENV_VAR_NAMES.reduce((currentValue, envVarName) => {
    const secretValue = process.env[envVarName];

    if (secretValue === undefined || secretValue.length === 0) {
      return currentValue;
    }

    return currentValue.split(secretValue).join(REDACTED_VALUE);
  }, redactCredentialedUrls(value));
}

function toSanitizedErrorMessage(error: unknown): string {
  return sanitizeText(error instanceof Error ? error.message : String(error));
}

function isSettledAttemptStatus(status: RunAttempt["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function buildExistingRunProgress(
  existingAttempts: ReadonlyArray<RunAttempt>,
  existingVerdicts: ReadonlyArray<EvaluationVerdict>,
): {
  readonly settledTaskIds: Set<string>;
  readonly attemptCountByTask: Map<string, number>;
  readonly completedTasks: number;
  readonly passedTasks: number;
  readonly failedTasks: number;
} {
  const settledTaskIds = new Set<string>();
  const attemptCountByTask = new Map<string, number>();
  const passedTaskIds = new Set(
    existingVerdicts.filter((verdict) => verdict.passed).map((verdict) => verdict.taskId),
  );

  for (const attempt of existingAttempts) {
    attemptCountByTask.set(attempt.taskId, (attemptCountByTask.get(attempt.taskId) ?? 0) + 1);

    if (isSettledAttemptStatus(attempt.status)) {
      settledTaskIds.add(attempt.taskId);
    }
  }

  let passedTasks = 0;
  for (const taskId of settledTaskIds) {
    if (passedTaskIds.has(taskId)) {
      passedTasks += 1;
    }
  }

  return {
    settledTaskIds,
    attemptCountByTask,
    completedTasks: settledTaskIds.size,
    passedTasks,
    failedTasks: settledTaskIds.size - passedTasks,
  };
}

// Clone repo at a specific commit into a temp directory
async function cloneAtCommit(cloneUrl: string, commitSha: string): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), "repobench-ws-"));

  try {
    await execFileAsync(
      "git",
      ["clone", "--no-checkout", createCloneUrl(cloneUrl), workspacePath],
      {
        timeout: 180_000,
      },
    );
    await execFileAsync("git", ["checkout", commitSha], {
      cwd: workspacePath,
      timeout: 60_000,
    });
    return workspacePath;
  } catch (error: unknown) {
    await cleanupWorkspace(workspacePath);
    throw error;
  }
}

async function cleanupWorkspace(workspacePath: string): Promise<void> {
  await rm(workspacePath, { recursive: true, force: true });
}

/**
 * Orchestrates a single benchmark run:
 * 1. Iterate over tasks in the suite
 * 2. For each task, prepare sandbox workspace
 * 3. Invoke agent adapter
 * 4. Evaluate the result
 * 5. Store metrics and artifacts
 */
export async function runBenchmarkJob(
  input: BenchmarkJobInput,
  databaseUrl: string,
): Promise<void> {
  const db = await createDatabaseConnection(databaseUrl);
  const runStore = createRunStore(db.sql);
  const runAttemptStore = createRunAttemptStore(db.sql);
  const evaluationVerdictStore = createEvaluationVerdictStore(db.sql);
  const taskStore = createTaskStore(db.sql);
  const agentProfileStore = createAgentProfileStore(db.sql);
  const repoStore = createRepositoryStore(db.sql);
  let runIdForFailure: string | null = null;
  let completedTasks = 0;
  let passedTasks = 0;
  let failedTasks = 0;
  let finalStatusWritten = false;

  try {
    const run = await runStore.findById(input.runId);
    if (run === null) {
      throw new Error(`Run not found: ${input.runId}`);
    }
    runIdForFailure = run.id;

    if (input.suiteId !== run.suiteId) {
      throw new Error(
        `Benchmark job suite mismatch: run=${run.id} queuedSuite=${input.suiteId} actualSuite=${run.suiteId}`,
      );
    }

    if (input.agentProfileId !== run.agentProfileId) {
      throw new Error(
        `Benchmark job agent mismatch: run=${run.id} queuedAgent=${input.agentProfileId} actualAgent=${run.agentProfileId}`,
      );
    }

    const agentProfile = await agentProfileStore.findById(run.agentProfileId);
    if (agentProfile === null) {
      throw new Error(`Agent profile not found: ${run.agentProfileId}`);
    }

    if (isHostedAgentProfile(agentProfile) && !isHostedExecutionAllowed()) {
      throw new Error(
        "Hosted agent execution is disabled. Set ALLOW_HOSTED_AGENT_EXECUTION=true to allow provider API calls.",
      );
    }

    const requiredCredentialEnvVar = getRequiredCredentialEnvVar(agentProfile);
    if (requiredCredentialEnvVar !== null) {
      const credentialValue = process.env[requiredCredentialEnvVar];
      if (credentialValue === undefined || credentialValue.trim().length === 0) {
        throw new Error(
          `Missing required credential environment variable: ${requiredCredentialEnvVar}`,
        );
      }
    }

    const tasks = await taskStore.findBySuite(run.suiteId);
    const [existingAttempts, existingVerdicts] = await Promise.all([
      runAttemptStore.findByRun(run.id),
      evaluationVerdictStore.findByRun(run.id),
    ]);
    const existingProgress = buildExistingRunProgress(existingAttempts, existingVerdicts);
    const settledTaskIds = existingProgress.settledTaskIds;
    const attemptCountByTask = existingProgress.attemptCountByTask;

    completedTasks = existingProgress.completedTasks;
    passedTasks = existingProgress.passedTasks;
    failedTasks = existingProgress.failedTasks;

    // eslint-disable-next-line no-console
    console.log(
      `Starting benchmark job: run=${run.id} agent=${agentProfile.name} tasks=${tasks.length} remaining=${tasks.length - settledTaskIds.size}`,
    );

    await runStore.updateStatus(run.id, "running", {
      completedTasks,
      passedTasks,
      failedTasks,
    });

    const adapter: AgentAdapter = createAgentAdapterForProfile(agentProfile);

    // Look up the repository for clone URL
    const firstTask = tasks[0];
    if (firstTask === undefined) {
      await runStore.updateStatus(run.id, "completed", {
        completedTasks,
        passedTasks,
        failedTasks,
      });
      finalStatusWritten = true;
      return;
    }

    const repo = await repoStore.findById(firstTask.repositoryId);
    if (repo === null) {
      throw new Error(`Repository not found: ${firstTask.repositoryId}`);
    }

    for (const task of tasks) {
      if (settledTaskIds.has(task.id)) {
        continue;
      }

      // eslint-disable-next-line no-console
      console.log(`Processing task: ${task.id} — ${task.title}`);
      const attemptId = randomUUID();
      const attemptStartedAt = new Date();
      const attemptNumber = (attemptCountByTask.get(task.id) ?? 0) + 1;
      let attemptPassed = false;
      let attemptStatus: "completed" | "failed" = "failed";
      let attemptErrorMessage: string | null = null;
      let workspacePath: string | null = null;
      let patchArtifactPath: string | null = null;
      let stdoutLogPath: string | null = null;
      let stderrLogPath: string | null = null;
      let tokenCount: number | null = null;
      let estimatedCostUsd: number | null = null;
      let durationMs: number | null = null;
      let verdictCreated = false;

      attemptCountByTask.set(task.id, attemptNumber);

      await runAttemptStore.create({
        id: attemptId,
        runId: run.id,
        taskId: task.id,
        agentProfileId: agentProfile.id,
        attemptNumber,
        status: "running",
        startedAt: attemptStartedAt,
        completedAt: null,
        patchArtifactPath: null,
        stdoutLogPath: null,
        stderrLogPath: null,
        tokenCount: null,
        estimatedCostUsd: null,
        durationMs: null,
        errorMessage: null,
      });

      try {
        workspacePath = await cloneAtCommit(repo.cloneUrl, task.snapshot.baseCommitSha);

        // Agent generates a patch
        const agentResult = await adapter.solve({
          task,
          workspacePath,
          timeoutMs: TASK_TIMEOUT_MS,
          agentProfile,
        });
        tokenCount = agentResult.tokenCount;
        estimatedCostUsd = agentResult.estimatedCostUsd;

        const persistedArtifacts = await persistAttemptArtifacts(
          run.id,
          task.id,
          attemptId,
          agentResult.patchContent,
          agentResult.stdout,
          agentResult.stderr,
        );
        patchArtifactPath = persistedArtifacts.patchArtifactPath;
        stdoutLogPath = persistedArtifacts.stdoutLogPath;
        stderrLogPath = persistedArtifacts.stderrLogPath;

        const patchResult = await evaluatePatchInSandbox(
          workspacePath,
          agentResult.patchContent,
          task.snapshot.testCommand,
          SANDBOX_IMAGE,
          TASK_TIMEOUT_MS,
        );
        durationMs = Date.now() - attemptStartedAt.getTime();

        if (patchResult.patchApplied && patchResult.testResult !== null) {
          const testResult = patchResult.testResult;
          durationMs = Date.now() - attemptStartedAt.getTime();

          if (!testResult.success) {
            const testDetails =
              testResult.stderr.length > 0 ? testResult.stderr : testResult.stdout;
            attemptErrorMessage = buildFailureMessage(
              "Sandbox test command failed",
              testDetails.length > 0 ? testDetails : `exitCode=${testResult.exitCode}`,
            );
          }

          // Score the run
          const verdict = scoreRun({
            attemptId,
            taskId: task.id,
            runId: run.id,
            patchApplied: patchResult.patchApplied,
            // The current snapshot contract exposes a single sandbox command,
            // so build success is derived conservatively from that observable outcome.
            buildPassed: testResult.success,
            testsPassed: testResult.success,
            durationMs,
            tokenCount: agentResult.tokenCount,
            estimatedCostUsd: agentResult.estimatedCostUsd,
            retryCount: 0,
          });
          await evaluationVerdictStore.create(verdict);
          verdictCreated = true;

          attemptPassed = verdict.passed;
          attemptStatus = verdict.passed ? "completed" : "failed";

          // eslint-disable-next-line no-console
          console.log(
            `Task ${task.id}: passed=${verdict.passed} score=${JSON.stringify(verdict.metrics)}`,
          );
        } else {
          durationMs = Date.now() - attemptStartedAt.getTime();
          attemptErrorMessage = buildFailureMessage(
            "Patch failed to apply",
            patchResult.patchOutput,
          );

          const verdict = scoreRun({
            attemptId,
            taskId: task.id,
            runId: run.id,
            patchApplied: false,
            buildPassed: false,
            testsPassed: false,
            durationMs,
            tokenCount: agentResult.tokenCount,
            estimatedCostUsd: agentResult.estimatedCostUsd,
            retryCount: 0,
          });
          await evaluationVerdictStore.create(verdict);
          verdictCreated = true;

          // eslint-disable-next-line no-console
          console.log(`Task ${task.id}: patch failed to apply`);
        }

        completedTasks++;
        if (attemptPassed) {
          passedTasks++;
        } else {
          failedTasks++;
        }
        settledTaskIds.add(task.id);
      } catch (taskError: unknown) {
        const message = toSanitizedErrorMessage(taskError);
        durationMs = Date.now() - attemptStartedAt.getTime();
        attemptErrorMessage = message;

        if (!verdictCreated) {
          const verdict = scoreRun({
            attemptId,
            taskId: task.id,
            runId: run.id,
            patchApplied: false,
            buildPassed: false,
            testsPassed: false,
            durationMs,
            tokenCount: tokenCount ?? 0,
            estimatedCostUsd: estimatedCostUsd ?? 0,
            retryCount: 0,
          });
          await evaluationVerdictStore.create(verdict);
          verdictCreated = true;
        }

        // eslint-disable-next-line no-console
        console.error(`Task ${task.id} failed with error: ${message}`);
        completedTasks++;
        failedTasks++;
        settledTaskIds.add(task.id);
      } finally {
        await runAttemptStore.update(attemptId, {
          status: attemptStatus,
          completedAt: new Date(),
          patchArtifactPath,
          stdoutLogPath,
          stderrLogPath,
          tokenCount,
          estimatedCostUsd,
          durationMs,
          errorMessage: attemptErrorMessage,
        });

        if (workspacePath !== null) {
          await cleanupWorkspace(workspacePath);
        }
      }

      // Update progress after each task
      await runStore.updateStatus(run.id, "running", {
        completedTasks,
        passedTasks,
        failedTasks,
      });
    }

    const finalStatus = failedTasks === tasks.length ? "failed" : "completed";
    await runStore.updateStatus(run.id, finalStatus, {
      completedTasks,
      passedTasks,
      failedTasks,
    });
    finalStatusWritten = true;

    // eslint-disable-next-line no-console
    console.log(`Benchmark job complete: run=${run.id} passed=${passedTasks}/${completedTasks}`);
  } catch (error: unknown) {
    const sanitizedMessage = toSanitizedErrorMessage(error);

    if (runIdForFailure !== null && !finalStatusWritten) {
      try {
        await runStore.updateStatus(runIdForFailure, "failed", {
          completedTasks,
          passedTasks,
          failedTasks,
        });
      } catch (statusError: unknown) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to mark run ${runIdForFailure} as failed: ${toSanitizedErrorMessage(statusError)}`,
        );
      }
    }

    // eslint-disable-next-line no-console
    console.error(
      `Benchmark job failed: run=${runIdForFailure ?? input.runId} error=${sanitizedMessage}`,
    );
    throw error;
  } finally {
    await db.close();
  }
}
