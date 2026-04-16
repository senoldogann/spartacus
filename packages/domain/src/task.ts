/**
 * The type of benchmark task derived from repository history.
 */
export type TaskType = "bugfix";

/**
 * Processing status of a task within a suite.
 */
export type TaskStatus = "pending" | "ready" | "skipped" | "error";

/**
 * A frozen snapshot of the repository at a specific commit,
 * representing the starting state for a benchmark task.
 */
export type TaskSnapshot = {
  readonly baseCommitSha: string;
  readonly headCommitSha: string;
  readonly patchDiff: string;
  readonly testCommand: string;
  readonly changedFiles: ReadonlyArray<string>;
};

/**
 * A single benchmark task derived from a merged PR or closed issue.
 * Represents a concrete problem for an agent to solve.
 */
export type Task = {
  readonly id: string;
  readonly suiteId: string;
  readonly repositoryId: string;
  readonly type: TaskType;
  readonly title: string;
  readonly description: string;
  readonly sourcePrNumber: number;
  readonly sourcePrUrl: string;
  readonly snapshot: TaskSnapshot;
  readonly status: TaskStatus;
  readonly createdAt: Date;
};

/**
 * A collection of benchmark tasks grouped for execution.
 */
export type BenchmarkSuite = {
  readonly id: string;
  readonly repositoryId: string;
  readonly name: string;
  readonly description: string;
  readonly taskCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
