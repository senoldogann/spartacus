import { spawn } from "node:child_process";

const MAX_COMMAND_OUTPUT_LENGTH = 10 * 1024 * 1024;

export type ApplyPatchResult = {
    readonly success: boolean;
    readonly output: string;
    readonly appliedDiff: string;
};

type GitCommandResult = {
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
};

function formatCommandOutput(result: GitCommandResult): string {
    return `${result.stdout}\n${result.stderr}`.trim();
}

function appendCommandOutput(existingOutput: string, chunk: Buffer): string {
    const nextOutput = `${existingOutput}${chunk.toString()}`;

    if (nextOutput.length <= MAX_COMMAND_OUTPUT_LENGTH) {
        return nextOutput;
    }

    return nextOutput.slice(0, MAX_COMMAND_OUTPUT_LENGTH);
}

async function runGitCommand(
    workspacePath: string,
    args: ReadonlyArray<string>,
    input?: string,
): Promise<GitCommandResult> {
    return new Promise((resolve, reject) => {
        const child = spawn("git", [...args], {
            cwd: workspacePath,
            timeout: 30_000,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => {
            stdout = appendCommandOutput(stdout, data);
        });

        child.stderr.on("data", (data: Buffer) => {
            stderr = appendCommandOutput(stderr, data);
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            resolve({
                exitCode: code ?? 1,
                stdout,
                stderr,
            });
        });

        if (input !== undefined) {
            child.stdin.write(input);
        }

        child.stdin.end();
    });
}

/**
 * Applies a unified diff patch to a workspace directory.
 * Returns the apply outcome and the resulting workspace diff.
 */
export async function applyPatch(
    workspacePath: string,
    patchContent: string,
): Promise<ApplyPatchResult> {
    if (patchContent.trim().length === 0) {
        return {
            success: false,
            output: "Patch content is empty",
            appliedDiff: "",
        };
    }

    const validationResult = await runGitCommand(
        workspacePath,
        ["apply", "--check", "--verbose", "-"],
        patchContent,
    );

    if (validationResult.exitCode !== 0) {
        return {
            success: false,
            output: formatCommandOutput(validationResult),
            appliedDiff: "",
        };
    }

    const applyResult = await runGitCommand(
        workspacePath,
        ["apply", "--verbose", "-"],
        patchContent,
    );

    if (applyResult.exitCode !== 0) {
        return {
            success: false,
            output: formatCommandOutput(applyResult),
            appliedDiff: "",
        };
    }

    const diffResult = await runGitCommand(
        workspacePath,
        ["diff", "--no-ext-diff", "--", "."],
    );

    if (diffResult.exitCode !== 0) {
        return {
            success: false,
            output: formatCommandOutput(diffResult),
            appliedDiff: "",
        };
    }

    const outputParts = [
        formatCommandOutput(validationResult),
        formatCommandOutput(applyResult),
        formatCommandOutput(diffResult),
    ].filter((part) => part.length > 0);

    return {
        success: true,
        output: outputParts.join("\n\n"),
        appliedDiff: diffResult.stdout.trim(),
    };
}
