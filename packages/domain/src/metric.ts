/**
 * Deterministic metric names tracked per task attempt.
 */
export type MetricName =
    | "patch_apply_success"
    | "build_success"
    | "test_success"
    | "task_pass"
    | "duration_ms"
    | "token_count"
    | "estimated_cost_usd"
    | "retry_count"
    | "one_shot";

/**
 * Metrics captured for a single task attempt.
 */
export type TaskMetrics = {
    readonly attemptId: string;
    readonly taskId: string;
    readonly runId: string;
    readonly patchApplySuccess: boolean;
    readonly buildSuccess: boolean;
    readonly testSuccess: boolean;
    readonly taskPass: boolean;
    readonly durationMs: number;
    readonly tokenCount: number;
    readonly estimatedCostUsd: number;
    readonly retryCount: number;
    readonly oneShot: boolean;
};

/**
 * Aggregated evaluation verdict for a run attempt.
 */
export type EvaluationVerdict = {
    readonly attemptId: string;
    readonly taskId: string;
    readonly runId: string;
    readonly passed: boolean;
    readonly metrics: TaskMetrics;
    readonly evaluatedAt: Date;
};

/**
 * Time-series data point for tracking metric trends across runs.
 */
export type MetricSeries = {
    readonly runId: string;
    readonly agentProfileId: string;
    readonly metricName: MetricName;
    readonly value: number;
    readonly recordedAt: Date;
};
