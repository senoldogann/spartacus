import { parseArgs } from "node:util";

/**
 * Start a benchmark run with a specified agent.
 */
export async function runCommand(args: ReadonlyArray<string>): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      agent: { type: "string" },
      suite: { type: "string" },
    },
    strict: false,
  });

  const agent = values["agent"] as string | undefined;
  const suite = (values["suite"] as string | undefined) ?? "default";

  if (agent === undefined) {
    throw new Error("--agent is required. Usage: repobench run --agent claude --suite default");
  }

  throw new Error(
    `The run command is not implemented yet. Use the API to create benchmark runs (agent: ${agent}, suite: ${suite}).`,
  );
}
