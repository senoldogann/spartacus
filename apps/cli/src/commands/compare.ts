import { parseArgs } from "node:util";

/**
 * Compare two benchmark runs side-by-side.
 */
export async function compareCommand(args: ReadonlyArray<string>): Promise<void> {
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

  if (runA === undefined || runB === undefined) {
    throw new Error(
      "--run-a and --run-b are required. Usage: repobench compare --run-a <id> --run-b <id>",
    );
  }

  throw new Error(
    `The compare command is not implemented yet. Use the API to compare benchmark runs (run-a: ${runA}, run-b: ${runB}).`,
  );
}
