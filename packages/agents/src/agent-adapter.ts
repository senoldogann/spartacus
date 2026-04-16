import type { Task, AgentProvider } from "@repobench/domain";

/**
 * Result of an agent attempting to solve a benchmark task.
 */
export type AgentResult = {
  readonly patchContent: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly tokenCount: number;
  readonly estimatedCostUsd: number;
  readonly durationMs: number;
};

/**
 * Common interface for all agent adapters.
 * Each adapter translates the benchmark task into the agent's native
 * invocation format and captures the output.
 */
export type AgentAdapter = {
  readonly provider: AgentProvider;
  readonly solve: (task: Task, workspacePath: string, timeoutMs: number) => Promise<AgentResult>;
};
