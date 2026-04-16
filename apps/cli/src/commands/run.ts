import { parseArgs } from "node:util";

/**
 * Start a benchmark run with a specified agent.
 */
export async function runCommand(
    args: ReadonlyArray<string>,
): Promise<void> {
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

    // eslint-disable-next-line no-console
    console.log(`Starting benchmark run: agent=${agent}, suite=${suite}`);

    // TODO: Enqueue run via API or direct worker invocation
    // eslint-disable-next-line no-console
    console.log("Run queued.");
}
