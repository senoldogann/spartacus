import { parseArgs } from "node:util";
import { apiClient } from "../api-client.js";

/**
 * Compare two benchmark runs side-by-side.
 */
export async function compareCommand(args: ReadonlyArray<string>): Promise<void> {
    const { values } = parseArgs({
        args: [...args],
        options: {
            "run-a": { type: "string" },
            "run-b": { type: "string" },
        },
        strict: false,
    });

    const runA = values["run-a"] as string | undefined;
    const runB = values["run-b"] as string | undefined;

    if (runA === undefined || runB === undefined) {
        throw new Error(
            "--run-a and --run-b are required. Usage: repobench compare --run-a <id> --run-b <id>",
        );
    }

    const comparison = await apiClient.compare.runs(runA, runB);

    const rows: ReadonlyArray<readonly [string, string, string]> = [
        ["ID", comparison.runA.id, comparison.runB.id],
        ["Status", comparison.runA.status, comparison.runB.status],
        ["Total Tasks", String(comparison.runA.totalTasks), String(comparison.runB.totalTasks)],
        ["Completed", String(comparison.runA.completedTasks), String(comparison.runB.completedTasks)],
        ["Passed", String(comparison.runA.passedTasks), String(comparison.runB.passedTasks)],
        ["Failed", String(comparison.runA.failedTasks), String(comparison.runB.failedTasks)],
        [
            "Completion Rate",
            `${(comparison.runA.completionRate * 100).toFixed(1)}%`,
            `${(comparison.runB.completionRate * 100).toFixed(1)}%`,
        ],
        [
            "Pass Rate",
            `${(comparison.runA.passRate * 100).toFixed(1)}%`,
            `${(comparison.runB.passRate * 100).toFixed(1)}%`,
        ],
    ];

    const headerMetric = "Metric";
    const headerA = "Run A";
    const headerB = "Run B";

    const col0 = Math.max(headerMetric.length, ...rows.map(([label]) => label.length));
    const col1 = Math.max(headerA.length, ...rows.map(([, a]) => a.length));
    const col2 = Math.max(headerB.length, ...rows.map(([, , b]) => b.length));

    const formatRow = (c0: string, c1: string, c2: string): string =>
        `${c0.padEnd(col0 + 2)}${c1.padEnd(col1 + 2)}${c2}`;

    // eslint-disable-next-line no-console
    console.log(`\nRun Comparison (Suite: ${comparison.suiteId})`);
    // eslint-disable-next-line no-console
    console.log("=".repeat(col0 + col1 + col2 + 4));
    // eslint-disable-next-line no-console
    console.log(formatRow(headerMetric, headerA, headerB));
    // eslint-disable-next-line no-console
    console.log("-".repeat(col0 + col1 + col2 + 4));

    for (const [label, a, b] of rows) {
        // eslint-disable-next-line no-console
        console.log(formatRow(label, a, b));
    }
}
