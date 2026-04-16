import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { DENY_ALL, toDockerNetworkArgs, type NetworkPolicy } from "./network-policy.js";

const execFileAsync = promisify(execFile);

export type WorkspaceMountMode = "ro" | "rw";

/**
 * Configuration for a Docker sandbox run.
 */
export type DockerRunConfig = {
  readonly image: string;
  readonly workspacePath: string;
  readonly command: ReadonlyArray<string>;
  readonly timeoutMs: number;
  readonly networkPolicy: NetworkPolicy;
  readonly workspaceMountMode: WorkspaceMountMode;
  readonly memoryLimitMb: number;
  readonly cpuLimit: number;
};

async function validateWorkspacePath(
  workspacePath: string,
  workspaceMountMode: WorkspaceMountMode,
): Promise<string> {
  if (workspacePath.trim().length === 0) {
    throw new Error("workspacePath is required");
  }

  if (workspacePath.includes(":")) {
    throw new Error("workspacePath must not contain ':'");
  }

  if (workspacePath.includes("\n") || workspacePath.includes("\r")) {
    throw new Error("workspacePath must not contain newlines");
  }

  const resolvedWorkspacePath = resolve(workspacePath);
  const accessMode = workspaceMountMode === "rw" ? constants.R_OK | constants.W_OK : constants.R_OK;

  await access(resolvedWorkspacePath, accessMode);

  return resolvedWorkspacePath;
}

function validateCommandArguments(command: ReadonlyArray<string>): void {
  if (command.length === 0) {
    throw new Error("command is required");
  }

  for (const argument of command) {
    if (argument.trim().length === 0) {
      throw new Error("command arguments must not be empty");
    }

    if (argument.includes("\n") || argument.includes("\r")) {
      throw new Error("command arguments must not contain newlines");
    }
  }
}

function validateImageName(image: string): void {
  if (image.trim().length === 0) {
    throw new Error("image is required");
  }

  if (image.includes("\n") || image.includes("\r")) {
    throw new Error("image must not contain newlines");
  }
}

/**
 * Result of a Docker sandbox execution.
 */
export type DockerRunResult = {
  readonly containerId: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
};

/**
 * Runs a command inside an ephemeral Docker container.
 * The container is automatically removed after execution.
 */
export async function runInDocker(config: DockerRunConfig): Promise<DockerRunResult> {
  validateImageName(config.image);
  validateCommandArguments(config.command);

  const resolvedWorkspacePath = await validateWorkspacePath(
    config.workspacePath,
    config.workspaceMountMode,
  );

  const containerId = `repobench-${randomUUID().slice(0, 8)}`;
  const startTime = Date.now();

  const args: string[] = [
    "run",
    "--rm",
    "--name",
    containerId,
    "--memory",
    `${config.memoryLimitMb}m`,
    "--cpus",
    String(config.cpuLimit),
    "-v",
    `${resolvedWorkspacePath}:/workspace:${config.workspaceMountMode}`,
    "-w",
    "/workspace",
  ];

  args.push(...toDockerNetworkArgs(config.networkPolicy ?? DENY_ALL));

  args.push(config.image);
  args.push(...config.command);

  try {
    const { stdout, stderr } = await execFileAsync("docker", args, {
      timeout: config.timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      containerId,
      exitCode: 0,
      stdout,
      stderr,
      durationMs: Date.now() - startTime,
      timedOut: false,
    };
  } catch (error: unknown) {
    const execError = error as {
      code?: string | number;
      stdout?: string;
      stderr?: string;
      killed?: boolean;
    };

    const timedOut = execError.killed === true;

    if (timedOut) {
      await killContainer(containerId);
    }

    return {
      containerId,
      exitCode: typeof execError.code === "number" ? execError.code : 1,
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      durationMs: Date.now() - startTime,
      timedOut,
    };
  }
}

/**
 * Force-kills a Docker container by name.
 */
async function killContainer(containerId: string): Promise<void> {
  try {
    await execFileAsync("docker", ["kill", containerId]);
  } catch {
    // Container may already be stopped
  }
}
