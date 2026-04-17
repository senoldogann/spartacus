import type { DockerRunResult, DockerRunConfig } from "@repobench/sandbox";
import { DENY_ALL, runInDocker } from "@repobench/sandbox";

const UNSAFE_SHELL_CHARACTER_PATTERN = /[|&;<>$`"'\\\n\r]/u;

function tokenizeTestCommand(testCommand: string): ReadonlyArray<string> {
  const normalizedCommand = testCommand.trim();

  if (normalizedCommand.length === 0) {
    throw new Error("testCommand is required");
  }

  if (UNSAFE_SHELL_CHARACTER_PATTERN.test(normalizedCommand)) {
    throw new Error(
      "testCommand contains unsupported shell characters; use a simple command with space-delimited arguments",
    );
  }

  return normalizedCommand.split(/\s+/u);
}

export function validateTestCommand(testCommand: string): void {
  tokenizeTestCommand(testCommand);
}

/**
 * Result of running the project's test suite.
 */
export type TestRunResult = {
  readonly success: boolean;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
};

/**
 * Runs the test command inside a sandboxed Docker container.
 */
export async function runTests(
  workspacePath: string,
  testCommand: string,
  image: string,
  timeoutMs: number,
): Promise<TestRunResult> {
  if (workspacePath.trim().length === 0) {
    throw new Error("workspacePath is required");
  }

  if (image.trim().length === 0) {
    throw new Error("image is required");
  }

  const config: DockerRunConfig = {
    image,
    workspacePath,
    command: tokenizeTestCommand(testCommand),
    timeoutMs,
    networkPolicy: DENY_ALL,
    workspaceMountMode: "rw",
    memoryLimitMb: 2048,
    cpuLimit: 2,
  };

  const result: DockerRunResult = await runInDocker(config);

  return {
    success: result.exitCode === 0 && !result.timedOut,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: result.durationMs,
    timedOut: result.timedOut,
  };
}
