import { parseArgs } from "node:util";

/**
 * Import benchmark tasks from a source (GitHub merged PRs).
 */
export async function importCommand(args: ReadonlyArray<string>): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      source: { type: "string" },
      limit: { type: "string" },
    },
    strict: false,
  });

  const source = (values["source"] as string | undefined) ?? "github";

  throw new Error(
    `The import command is not implemented yet. Use the API to import benchmark tasks (source: ${source}).`,
  );
}
