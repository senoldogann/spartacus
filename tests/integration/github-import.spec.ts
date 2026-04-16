import { describe, it, expect } from "vitest";

/**
 * Integration test: GitHub import pipeline.
 * Requires GITHUB_TOKEN environment variable.
 *
 * Tests the full flow:
 * 1. Fetch repository metadata
 * 2. Import merged PRs
 * 3. Filter bugfix candidates
 * 4. Build task snapshots
 */
describe("GitHub Import Pipeline", () => {
    it.todo("fetches repository metadata from GitHub API");

    it.todo("imports merged PRs with pagination");

    it.todo("filters bugfix candidates correctly");

    it.todo("builds task snapshots with valid diff content");

    it.todo("skips PRs with too many changed files");
});
