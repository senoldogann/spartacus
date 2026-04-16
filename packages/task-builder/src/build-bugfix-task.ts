import type { Task, TaskSnapshot } from "@repobench/domain";
import type { PrCandidate } from "@repobench/repo-ingest";
import { randomUUID } from "node:crypto";

/**
 * Builds a benchmark task from a filtered PR candidate and its snapshot.
 */
export function buildBugfixTask(
    suiteId: string,
    repositoryId: string,
    candidate: PrCandidate,
    snapshot: TaskSnapshot,
): Task {
    return {
        id: randomUUID(),
        suiteId,
        repositoryId,
        type: "bugfix",
        title: candidate.title,
        description: candidate.description,
        sourcePrNumber: candidate.prNumber,
        sourcePrUrl: candidate.url,
        snapshot,
        status: "ready",
        createdAt: new Date(),
    };
}
