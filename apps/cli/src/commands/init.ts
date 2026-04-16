import { parseArgs } from "node:util";

/**
 * Initialize RepoBench configuration for a repository.
 * Creates a .repobench.yml config file in the current directory.
 */
export async function initCommand(
    args: ReadonlyArray<string>,
): Promise<void> {
    const { values } = parseArgs({
        args: [...args],
        options: {
            repo: { type: "string" },
        },
        strict: false,
    });

    const repo = values["repo"] as string | undefined;
    if (repo === undefined) {
        throw new Error("--repo is required. Usage: repobench init --repo owner/name");
    }

    // eslint-disable-next-line no-console
    console.log(`Initializing RepoBench for ${repo}...`);

    // TODO: Create .repobench.yml, register repo in store
    // eslint-disable-next-line no-console
    console.log("Created .repobench.yml");
}
