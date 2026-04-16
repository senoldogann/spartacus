import { parseArgs } from "node:util";

/**
 * Compare two benchmark runs side-by-side.
 */
export async function compareCommand(
    args: ReadonlyArray<string>,
): Promise<void> {
    const { values } = parseArgs({
        args: [...args],
        options: {
            "run-a": { type: "string" },
            "run-b": { type: "string" },
            format: { type: "string" },
        },
        strict: false,
    });

    const runA = values["run-a"] as string | undefined;
    const runB = values["run-b"] as string | undefined;
    const format = (values["format"] as string | undefined) ?? "table";

    if (runA === undefined || runB === undefined) {
        throw new Error(
            "--run-a and --run-b are required. Usage: repobench compare --run-a <id> --run-b <id>",
        );
    }

    // eslint-disable-next-line no-console
    console.log(`Comparing runs ${runA} vs ${runB} (format: ${format})...`);

    // TODO: Fetch both run results and produce comparison
    // eslint-disable-next-line no-console
    console.log("Comparison complete.");
}
