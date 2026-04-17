import { describe, expect, it } from "vitest";
import { fetchRepository } from "../../packages/repo-ingest/src/github-client.js";
import { fetchMergedPrs } from "../../packages/repo-ingest/src/pr-importer.js";
import { createSnapshot } from "../../packages/repo-ingest/src/repo-snapshot.js";
import { filterBugfixCandidates } from "../../packages/task-builder/src/index.js";

const githubToken = process.env["GITHUB_TOKEN"];
const describeGitHubIntegration =
  githubToken === undefined || githubToken.trim().length === 0 ? describe.skip : describe;

describeGitHubIntegration("GitHub Import Pipeline", () => {
  it("fetches repository metadata from GitHub API", async () => {
    const repository = await fetchRepository("senoldogann", "spartacus", githubToken as string);

    expect(repository.owner).toBe("senoldogann");
    expect(repository.name).toBe("spartacus");
    expect(repository.fullName).toBe("senoldogann/spartacus");
    expect(repository.cloneUrl).toContain("github.com");
  });

  it("imports merged PRs, filters bugfix candidates, and builds a snapshot", async () => {
    const pullRequests = await fetchMergedPrs(
      "senoldogann",
      "spartacus",
      githubToken as string,
      20,
    );

    expect(pullRequests.length).toBeGreaterThan(0);

    const candidates = filterBugfixCandidates(pullRequests);
    const snapshotSource = candidates[0] ?? pullRequests[0];
    if (snapshotSource === undefined) {
      throw new Error("Expected at least one merged pull request");
    }

    const snapshot = await createSnapshot(
      "senoldogann",
      "spartacus",
      snapshotSource.prNumber,
      snapshotSource.baseSha,
      snapshotSource.headSha,
      githubToken as string,
      "pnpm test",
    );

    expect(
      candidates.every((candidate) =>
        pullRequests.some((pullRequest) => pullRequest.prNumber === candidate.prNumber),
      ),
    ).toBe(true);
    expect(snapshot.baseCommitSha).toBe(snapshotSource.baseSha);
    expect(snapshot.headCommitSha).toBe(snapshotSource.headSha);
    expect(snapshot.patchDiff.length).toBeGreaterThan(0);
    expect(snapshot.changedFiles.length).toBeGreaterThan(0);
  }, 120_000);
});
