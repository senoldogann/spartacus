import { parseArgs } from "node:util";

/**
 * Import benchmark tasks from a source (GitHub merged PRs).
 */
export async function importCommand(
    args: ReadonlyArray<string>,
): Promise<void> {
    const { values } = parseArgs({
        args: [...args],
        options: {
            source: { type: "string" },
            limit: { type: "string" },
        },
        strict: false,
    });

    const source = (values["source"] as string | undefined) ?? "github";
    const limit = parseInt((values["limit"] as string | undefined) ?? "50", 10);

    // eslint-disable-next-line no-console
    console.log(`Importing tasks from ${source} (limit: ${limit})...`);

    // TODO: Wire to repo-ingest + task-builder pipeline
    // eslint-disable-next-line no-console
    console.log("Import complete.");
}
