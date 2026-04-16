/**
 * Supported agent provider identifiers.
 */
export type AgentProvider = "claude" | "codex" | "open-source";

/**
 * Configuration profile for an agent participating in a benchmark run.
 */
export type AgentProfile = {
    readonly id: string;
    readonly name: string;
    readonly provider: AgentProvider;
    readonly model: string;
    readonly config: Record<string, unknown>;
    readonly createdAt: Date;
};

/**
 * Lifecycle status of a benchmark run.
 */
export type RunStatus =
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

/**
 * A single attempt by an agent on a specific task within a run.
 */
export type RunAttempt = {
    readonly id: string;
    readonly runId: string;
    readonly taskId: string;
    readonly agentProfileId: string;
    readonly attemptNumber: number;
    readonly status: RunStatus;
    readonly startedAt: Date | null;
    readonly completedAt: Date | null;
    readonly patchArtifactPath: string | null;
    readonly stdoutLogPath: string | null;
    readonly stderrLogPath: string | null;
    readonly tokenCount: number | null;
    readonly estimatedCostUsd: number | null;
    readonly durationMs: number | null;
    readonly errorMessage: string | null;
};

/**
 * A benchmark run — executing a suite of tasks with a specific agent profile.
 */
export type Run = {
    readonly id: string;
    readonly suiteId: string;
    readonly agentProfileId: string;
    readonly status: RunStatus;
    readonly totalTasks: number;
    readonly completedTasks: number;
    readonly passedTasks: number;
    readonly failedTasks: number;
    readonly startedAt: Date | null;
    readonly completedAt: Date | null;
    readonly createdAt: Date;
};
