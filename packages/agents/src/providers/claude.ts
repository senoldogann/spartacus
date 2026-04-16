import type { Task } from "@repobench/domain";
import type { AgentAdapter, AgentResult } from "../agent-adapter.js";

/**
 * Claude agent adapter.
 * Invokes Anthropic Claude API to solve a benchmark task.
 */
export function createClaudeAdapter(): AgentAdapter {
  return {
    provider: "claude",
    solve: async (
      _task: Task,
      _workspacePath: string,
      _timeoutMs: number,
    ): Promise<AgentResult> => {
      // TODO: Implement Claude API invocation
      throw new Error("Claude adapter not yet implemented");
    },
  };
}
