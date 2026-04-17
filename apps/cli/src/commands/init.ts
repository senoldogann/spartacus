import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
function isValidRepositoryName(value: string): boolean {
    return /^[^/\s]+\/[^/\s]+$/u.test(value);
}

/**
 * Initialize RepoBench configuration for a repository.
 * Creates a .repobench.yml config file in the current directory.
 */
export async function initCommand(args: ReadonlyArray<string>): Promise<void> {
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

    if (!isValidRepositoryName(repo)) {
        throw new Error("--repo must be in owner/name format. Usage: repobench init --repo owner/name");
    }

    // eslint-disable-next-line no-console
    console.log(`Initializing RepoBench for ${repo}...`);

    const configPath = resolve(process.cwd(), ".repobench.yml");
    const configContent = [`repo: ${repo}`, "source: github", ""].join("\n");

    try {
        await writeFile(configPath, configContent, {
            encoding: "utf8",
            flag: "wx",
        });
    } catch (error: unknown) {
        if (error instanceof Error && "code" in error && error.code === "EEXIST") {
            throw new Error(
                `.repobench.yml already exists in this directory. Remove it first if you want to reinitialize.`,
            );
        }
        throw error;
    }

    // eslint-disable-next-line no-console
    console.log("Created .repobench.yml");
}
