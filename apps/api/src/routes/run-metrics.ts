import type { Run } from "@repobench/domain";

type RunProgress = Pick<Run, "totalTasks" | "completedTasks" | "passedTasks">;

export function calculatePassRate(run: RunProgress): number {
  if (run.totalTasks === 0) {
    return 0;
  }

  return run.passedTasks / run.totalTasks;
}

export function calculateCompletionRate(run: RunProgress): number {
  if (run.totalTasks === 0) {
    return 0;
  }

  return run.completedTasks / run.totalTasks;
}
