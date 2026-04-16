import type { Task } from "@repobench/domain";
import type { AgentAdapter, AgentResult } from "../agent-adapter.js";

/**
 * OpenAI Codex agent adapter.
 * Invokes OpenAI Codex API to solve a benchmark task.
 */
export function createCodexAdapter(): AgentAdapter {
    return {
        provider: "codex",
        solve: async (
            _task: Task,
            _workspacePath: string,
            _timeoutMs: number,
        ): Promise<AgentResult> => {
            // TODO: Implement Codex API invocation
            throw new Error("Codex adapter not yet implemented");
        },
    };
}
