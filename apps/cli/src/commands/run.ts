import { parseArgs } from "node:util";
import { apiClient } from "../api-client.js";

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

  const agentProfileId = values["agent"] as string | undefined;
  const suiteId = values["suite"] as string | undefined;

  if (suiteId === undefined) {
    throw new Error(
      "--suite is required. Usage: repobench run --suite <suiteId> --agent <agentProfileId>",
    );
  }

  if (agentProfileId === undefined) {
    throw new Error(
      "--agent is required. Usage: repobench run --suite <suiteId> --agent <agentProfileId>",
    );
  }

  const run = await apiClient.runs.create(suiteId, agentProfileId);

  // eslint-disable-next-line no-console
  console.log(`Run created: ${run.id}`);
  // eslint-disable-next-line no-console
  console.log(`Status: ${run.status}`);
}
