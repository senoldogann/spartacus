import { parseArgs } from "node:util";
import { apiClient } from "../api-client.js";

/**
 * Display results of a benchmark run.
 */
export async function reportCommand(args: ReadonlyArray<string>): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      run: { type: "string" },
    },
    strict: false,
  });

  const runId = values["run"] as string | undefined;

  if (runId === undefined) {
    throw new Error("--run is required. Usage: repobench report --run <run-id>");
  }

  const report = await apiClient.runs.report(runId);

  const rows: ReadonlyArray<readonly [string, string]> = [
    ["Run ID", report.runId],
    ["Status", report.status],
    ["Total Tasks", String(report.totalTasks)],
    ["Completed", String(report.completedTasks)],
    ["Passed", String(report.passedTasks)],
    ["Failed", String(report.failedTasks)],
    ["Completion Rate", `${(report.completionRate * 100).toFixed(1)}%`],
    ["Pass Rate", `${(report.passRate * 100).toFixed(1)}%`],
  ];

  const labelWidth = Math.max(...rows.map(([label]) => label.length));

  // eslint-disable-next-line no-console
  console.log("\nBenchmark Run Report");
  // eslint-disable-next-line no-console
  console.log("=".repeat(labelWidth + 20));

  for (const [label, value] of rows) {
    // eslint-disable-next-line no-console
    console.log(`${label.padEnd(labelWidth + 2)}${value}`);
  }
}
