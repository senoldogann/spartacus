import type { Task } from "@repobench/domain";
import type { AgentAdapter, AgentResult } from "../agent-adapter.js";

/**
 * Open-source model agent adapter.
 * Invokes a locally running or API-hosted open-source model.
 */
export function createOpenSourceAdapter(): AgentAdapter {
  return {
    provider: "open-source",
    solve: async (
      _task: Task,
      _workspacePath: string,
      _timeoutMs: number,
    ): Promise<AgentResult> => {
      // TODO: Implement open-source model invocation
      throw new Error("Open-source adapter not yet implemented");
    },
  };
}
