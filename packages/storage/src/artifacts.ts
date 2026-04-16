/**
 * Interface for storing and retrieving benchmark artifacts
 * (patches, logs, reports) in an S3-compatible object store.
 */
export type ArtifactStore = {
    readonly upload: (
        key: string,
        content: Buffer | string,
        contentType: string,
    ) => Promise<string>;

    readonly download: (key: string) => Promise<Buffer>;

    readonly getSignedUrl: (
        key: string,
        expiresInSeconds: number,
    ) => Promise<string>;

    readonly delete: (key: string) => Promise<void>;

    readonly list: (prefix: string) => Promise<ReadonlyArray<string>>;
};

/**
 * Generates a structured artifact key for a run attempt.
 */
export function buildArtifactKey(
    runId: string,
    taskId: string,
    attemptId: string,
    filename: string,
): string {
    return `runs/${runId}/tasks/${taskId}/attempts/${attemptId}/${filename}`;
}
