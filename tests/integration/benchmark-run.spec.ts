import { describe, it, expect } from "vitest";

/**
 * Integration test: Benchmark run pipeline.
 * Requires Docker running.
 *
 * Tests the full flow:
 * 1. Create workspace from snapshot
 * 2. Run agent (mock adapter for test)
 * 3. Apply agent patch
 * 4. Run tests in sandbox
 * 5. Score results
 */
describe("Benchmark Run Pipeline", () => {
    it.todo("creates ephemeral workspace from task snapshot");

    it.todo("runs agent adapter and captures output");

    it.todo("applies patch to workspace");

    it.todo("runs test command in Docker sandbox");

    it.todo("produces correct evaluation verdict");

    it.todo("cleans up workspace after completion");

    it.todo("handles agent timeout correctly");
});
