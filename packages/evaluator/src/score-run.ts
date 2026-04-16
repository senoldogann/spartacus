import type { TaskMetrics, EvaluationVerdict } from "@repobench/domain";

/**
 * Input data required to score a single run attempt.
 */
export type ScoreInput = {
  readonly attemptId: string;
  readonly taskId: string;
  readonly runId: string;
  readonly patchApplied: boolean;
  readonly buildPassed: boolean;
  readonly testsPassed: boolean;
  readonly durationMs: number;
  readonly tokenCount: number;
  readonly estimatedCostUsd: number;
  readonly retryCount: number;
};

/**
 * Produces a deterministic evaluation verdict from raw scoring input.
 * No LLM judge — all metrics are computed from observable outcomes.
 */
export function scoreRun(input: ScoreInput): EvaluationVerdict {
  const taskPass = input.patchApplied && input.buildPassed && input.testsPassed;
  const oneShot = taskPass && input.retryCount === 0;

  const metrics: TaskMetrics = {
    attemptId: input.attemptId,
    taskId: input.taskId,
    runId: input.runId,
    patchApplySuccess: input.patchApplied,
    buildSuccess: input.buildPassed,
    testSuccess: input.testsPassed,
    taskPass,
    durationMs: input.durationMs,
    tokenCount: input.tokenCount,
    estimatedCostUsd: input.estimatedCostUsd,
    retryCount: input.retryCount,
    oneShot,
  };

  return {
    attemptId: input.attemptId,
    taskId: input.taskId,
    runId: input.runId,
    passed: taskPass,
    metrics,
    evaluatedAt: new Date(),
  };
}
