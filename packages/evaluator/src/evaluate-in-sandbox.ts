import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DockerRunConfig, DockerRunResult } from "@repobench/sandbox";
import { DENY_ALL, runInDocker } from "@repobench/sandbox";
import { validateTestCommand } from "./run-tests.js";

const PATCH_FILENAME = ".repobench-agent.patch";

function tokenizeCommand(command: string): ReadonlyArray<string> {
  validateTestCommand(command);
  return command.trim().split(/\s+/u);
}

function toPatchOutput(result: DockerRunResult): string {
  return `${result.stdout}\n${result.stderr}`.trim();
}

function createDockerConfig(
  workspacePath: string,
  image: string,
  timeoutMs: number,
  command: ReadonlyArray<string>,
): DockerRunConfig {
  return {
    image,
    workspacePath,
    command,
    timeoutMs,
    networkPolicy: DENY_ALL,
    workspaceMountMode: "rw",
    memoryLimitMb: 2048,
    cpuLimit: 2,
  };
}

export type SandboxPatchEvaluationResult = {
  readonly patchApplied: boolean;
  readonly patchOutput: string;
  readonly appliedDiff: string;
  readonly testResult: {
    readonly success: boolean;
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly durationMs: number;
    readonly timedOut: boolean;
  } | null;
};

export async function evaluatePatchInSandbox(
  workspacePath: string,
  patchContent: string,
  testCommand: string,
  image: string,
  timeoutMs: number,
): Promise<SandboxPatchEvaluationResult> {
  if (patchContent.trim().length === 0) {
    return {
      patchApplied: false,
      patchOutput: "Patch content is empty",
      appliedDiff: "",
      testResult: null,
    };
  }

  const patchPath = join(workspacePath, PATCH_FILENAME);
  const tokenizedTestCommand = tokenizeCommand(testCommand);

  await writeFile(patchPath, patchContent, "utf8");

  try {
    const validationResult = await runInDocker(
      createDockerConfig(workspacePath, image, timeoutMs, [
        "git",
        "apply",
        "--check",
        "--verbose",
        PATCH_FILENAME,
      ]),
    );

    if (validationResult.exitCode !== 0 || validationResult.timedOut) {
      return {
        patchApplied: false,
        patchOutput: toPatchOutput(validationResult),
        appliedDiff: "",
        testResult: null,
      };
    }

    const applyResult = await runInDocker(
      createDockerConfig(workspacePath, image, timeoutMs, [
        "git",
        "apply",
        "--verbose",
        PATCH_FILENAME,
      ]),
    );

    if (applyResult.exitCode !== 0 || applyResult.timedOut) {
      return {
        patchApplied: false,
        patchOutput: toPatchOutput(applyResult),
        appliedDiff: "",
        testResult: null,
      };
    }

    const diffResult = await runInDocker(
      createDockerConfig(workspacePath, image, timeoutMs, [
        "git",
        "diff",
        "--no-ext-diff",
        "--",
        ".",
      ]),
    );

    if (diffResult.exitCode !== 0 || diffResult.timedOut) {
      return {
        patchApplied: false,
        patchOutput: toPatchOutput(diffResult),
        appliedDiff: "",
        testResult: null,
      };
    }

    await rm(patchPath, { force: true });

    const testResult = await runInDocker(
      createDockerConfig(workspacePath, image, timeoutMs, tokenizedTestCommand),
    );

    return {
      patchApplied: true,
      patchOutput: [
        toPatchOutput(validationResult),
        toPatchOutput(applyResult),
        toPatchOutput(diffResult),
      ]
        .filter((part) => part.length > 0)
        .join("\n\n"),
      appliedDiff: diffResult.stdout.trim(),
      testResult: {
        success: testResult.exitCode === 0 && !testResult.timedOut,
        exitCode: testResult.exitCode,
        stdout: testResult.stdout,
        stderr: testResult.stderr,
        durationMs: testResult.durationMs,
        timedOut: testResult.timedOut,
      },
    };
  } finally {
    await rm(patchPath, { force: true });
  }
}
