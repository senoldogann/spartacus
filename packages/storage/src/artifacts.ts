import { isAbsolute, relative, resolve } from "node:path";

/**
 * Interface for storing and retrieving benchmark artifacts
 * (patches, logs, reports) in an S3-compatible object store.
 */
export type ArtifactStore = {
  readonly upload: (key: string, content: Buffer | string, contentType: string) => Promise<string>;

  readonly download: (key: string) => Promise<Buffer>;

  readonly getSignedUrl: (key: string, expiresInSeconds: number) => Promise<string>;

  readonly delete: (key: string) => Promise<void>;

  readonly list: (prefix: string) => Promise<ReadonlyArray<string>>;
};

const INVALID_KEY_SEGMENT_PATTERN = /[/\\]/u;

function validateKeySegment(segment: string, name: string): void {
  if (segment.trim().length === 0) {
    throw new Error(`${name} must not be empty`);
  }
  if (INVALID_KEY_SEGMENT_PATTERN.test(segment)) {
    throw new Error(`${name} must not contain path separators: ${name}="${segment}"`);
  }
  if (segment.includes("..") || segment.includes("%2F") || segment.includes("%5C")) {
    throw new Error(`${name} contains path traversal sequence: ${name}="${segment}"`);
  }
}

/**
 * Generates a structured artifact key for a run attempt.
 */
export function buildArtifactKey(
  runId: string,
  taskId: string,
  attemptId: string,
  filename: string,
): string {
  validateKeySegment(runId, "runId");
  validateKeySegment(taskId, "taskId");
  validateKeySegment(attemptId, "attemptId");
  validateKeySegment(filename, "filename");
  return `runs/${runId}/tasks/${taskId}/attempts/${attemptId}/${filename}`;
}

/**
 * Resolves a local artifact key beneath the configured artifact root.
 */
export function resolveLocalArtifactPath(artifactsRoot: string, artifactKey: string): string {
  const artifactPath = resolve(artifactsRoot, artifactKey);
  const relativePath = relative(artifactsRoot, artifactPath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Artifact path escaped artifact root: key=${artifactKey}`);
  }

  return artifactPath;
}
