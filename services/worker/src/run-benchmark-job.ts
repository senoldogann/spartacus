import type { Task, Run, AgentProfile } from "@repobench/domain";

/**
 * Input for a single benchmark job.
 */
export type BenchmarkJobInput = {
  readonly run: Run;
  readonly tasks: ReadonlyArray<Task>;
  readonly agentProfile: AgentProfile;
};

/**
 * Orchestrates a single benchmark run:
 * 1. Iterate over tasks in the suite
 * 2. For each task, prepare sandbox workspace
 * 3. Invoke agent adapter
 * 4. Evaluate the result
 * 5. Store metrics and artifacts
 */
export async function runBenchmarkJob(input: BenchmarkJobInput): Promise<void> {
  const { run, tasks, agentProfile } = input;

  // eslint-disable-next-line no-console
  console.log(
    `Starting benchmark job: run=${run.id} agent=${agentProfile.name} tasks=${tasks.length}`,
  );

  for (const task of tasks) {
    // eslint-disable-next-line no-console
    console.log(`Processing task: ${task.id} — ${task.title}`);

    // TODO:
    // 1. createWorkspace(snapshot)
    // 2. agent.solve(task, workspacePath, timeoutMs)
    // 3. applyPatch(workspacePath, result.patchContent)
    // 4. runTests(workspacePath, task.snapshot.testCommand)
    // 5. scoreRun(input)
    // 6. Store verdict + artifacts
    // 7. removeWorkspace(workspacePath)
  }

  // eslint-disable-next-line no-console
  console.log(`Benchmark job complete: run=${run.id}`);
}
