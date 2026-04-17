import { parseArgs } from "node:util";
import { apiClient } from "../api-client.js";

/**
 * Import benchmark tasks from a source (GitHub merged PRs).
 */
export async function importCommand(args: ReadonlyArray<string>): Promise<void> {
    const { values } = parseArgs({
        args: [...args],
        options: {
            repo: { type: "string" },
            name: { type: "string" },
            "test-command": { type: "string" },
            "max-prs": { type: "string" },
        },
        strict: false,
    });

    const repoArg = values["repo"] as string | undefined;
    if (repoArg === undefined) {
        throw new Error("--repo is required. Usage: repobench import --repo owner/name --test-command 'npm test'");
    }

    const slashIndex = repoArg.indexOf("/");
    if (slashIndex === -1 || slashIndex === 0 || slashIndex === repoArg.length - 1) {
        throw new Error("--repo must be in owner/name format (e.g. facebook/react)");
    }

    const owner = repoArg.slice(0, slashIndex);
    const repoName = repoArg.slice(slashIndex + 1);

    const testCommand = values["test-command"] as string | undefined;
    if (testCommand === undefined) {
        throw new Error("--test-command is required. Usage: repobench import --repo owner/name --test-command 'npm test'");
    }

    const suiteName = (values["name"] as string | undefined) ?? `${owner}/${repoName}`;
    const rawMaxPrs = values["max-prs"] as string | undefined;
    const maxPrs = rawMaxPrs !== undefined ? parseInt(rawMaxPrs, 10) : undefined;

    if (maxPrs !== undefined && (isNaN(maxPrs) || maxPrs < 1)) {
        throw new Error("--max-prs must be a positive integer");
    }

    const repo = await apiClient.repos.create(owner, repoName);

    const suiteBody = maxPrs !== undefined
        ? { name: suiteName, testCommand, maxPrs }
        : { name: suiteName, testCommand };

    const suite = await apiClient.suites.create(repo.id, suiteBody);

    // eslint-disable-next-line no-console
    console.log(`Suite created: ${suite.id}`);
    // eslint-disable-next-line no-console
    console.log(`Tasks: ${String(suite.taskCount)}`);
}
