import { constants } from "node:fs";
import { access, cp, mkdtemp, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const WORKSPACE_DIRECTORY_PREFIX = join(tmpdir(), "repobench-ws-");

async function validateSnapshotPath(snapshotPath: string): Promise<string> {
  if (snapshotPath.trim().length === 0) {
    throw new Error("snapshotPath is required");
  }

  const resolvedSnapshotPath = resolve(snapshotPath);

  await access(resolvedSnapshotPath, constants.R_OK);

  const snapshotStats = await stat(resolvedSnapshotPath);
  if (!snapshotStats.isDirectory()) {
    throw new Error("snapshotPath must be a readable directory");
  }

  return resolvedSnapshotPath;
}

function validateWorkspaceRemovalPath(workspacePath: string): string {
  const resolvedWorkspacePath = resolve(workspacePath);

  if (!resolvedWorkspacePath.startsWith(WORKSPACE_DIRECTORY_PREFIX)) {
    throw new Error("Refusing to remove a non-RepoBench workspace path");
  }

  return resolvedWorkspacePath;
}

/**
 * Creates a mutable workspace directory by copying the source snapshot.
 */
export async function createWorkspace(snapshotPath: string): Promise<string> {
  const resolvedSnapshotPath = await validateSnapshotPath(snapshotPath);

  const workspacePath = await mkdtemp(join(tmpdir(), "repobench-ws-"));
  await cp(resolvedSnapshotPath, workspacePath, { recursive: true });
  return workspacePath;
}

/**
 * Cleans up an ephemeral workspace directory.
 */
export async function removeWorkspace(workspacePath: string): Promise<void> {
  const validatedWorkspacePath = validateWorkspaceRemovalPath(workspacePath);
  await rm(validatedWorkspacePath, { recursive: true, force: true });
}
