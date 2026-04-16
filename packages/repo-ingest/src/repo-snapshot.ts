import type { TaskSnapshot } from "@repobench/domain";

/**
 * Fetches the diff for a specific PR and constructs a TaskSnapshot.
 */
export async function createSnapshot(
    owner: string,
    repo: string,
    prNumber: number,
    baseSha: string,
    headSha: string,
    token: string,
): Promise<TaskSnapshot> {
    const diffUrl =
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;

    const diffResponse = await fetch(diffUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.diff",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    if (!diffResponse.ok) {
        const body = await diffResponse.text();
        throw new Error(
            `GitHub diff fetch error: status=${diffResponse.status} pr=${prNumber} body=${body}`,
        );
    }

    const patchDiff = await diffResponse.text();
    const changedFiles = extractChangedFiles(patchDiff);

    return {
        baseCommitSha: baseSha,
        headCommitSha: headSha,
        patchDiff,
        testCommand: "npm test",
        changedFiles,
    };
}

/**
 * Extracts file paths from a unified diff.
 */
function extractChangedFiles(diff: string): ReadonlyArray<string> {
    const files = new Set<string>();
    const lines = diff.split("\n");

    for (const line of lines) {
        const diffHeaderPaths = parseDiffHeaderPaths(line);
        if (diffHeaderPaths === null) {
            continue;
        }

        const previousPath = normalizeDiffPath(diffHeaderPaths.previousPath);
        const nextPath = normalizeDiffPath(diffHeaderPaths.nextPath);

        if (previousPath !== nextPath && nextPath !== "/dev/null") {
            files.add(nextPath);
            continue;
        }

        if (previousPath !== "/dev/null") {
            files.add(previousPath);
        }
    }

    return [...files];
}

function parseDiffHeaderPaths(
    line: string,
): { readonly previousPath: string; readonly nextPath: string } | null {
    const quotedMatch = /^diff --git "a\/(.+)" "b\/(.+)"$/u.exec(line);
    if (quotedMatch !== null) {
        const previousPath = quotedMatch[1];
        const nextPath = quotedMatch[2];

        if (previousPath !== undefined && nextPath !== undefined) {
            return { previousPath, nextPath };
        }
    }

    const unquotedMatch = /^diff --git a\/(.+) b\/(.+)$/u.exec(line);
    if (unquotedMatch === null) {
        return null;
    }

    const previousPath = unquotedMatch[1];
    const nextPath = unquotedMatch[2];

    if (previousPath === undefined || nextPath === undefined) {
        return null;
    }

    return { previousPath, nextPath };
}

function normalizeDiffPath(filePath: string): string {
    return filePath
        .replace(/\\\\/gu, "\\")
        .replace(/\\"/gu, '"');
}
