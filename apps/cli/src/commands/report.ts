import { parseArgs } from "node:util";

/**
 * Display results of a benchmark run.
 */
export async function reportCommand(
    args: ReadonlyArray<string>,
): Promise<void> {
    const { values } = parseArgs({
        args: [...args],
        options: {
            run: { type: "string" },
            format: { type: "string" },
        },
        strict: false,
    });

    const runId = values["run"] as string | undefined;
    const format = (values["format"] as string | undefined) ?? "table";

    if (runId === undefined) {
        throw new Error("--run is required. Usage: repobench report --run <run-id>");
    }

    // eslint-disable-next-line no-console
    console.log(`Generating report for run ${runId} (format: ${format})...`);

    // TODO: Fetch run results from API/store and render
    // eslint-disable-next-line no-console
    console.log("Report complete.");
}
