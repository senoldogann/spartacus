import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const CLI_BIN = "../../apps/cli/dist/index.js";

test.describe("CLI", () => {
  test("--version prints version", async () => {
    const { stdout } = await exec("node", [CLI_BIN, "--version"]);
    expect(stdout.trim()).toMatch(/repobench \d+\.\d+\.\d+/);
  });

  test("help shows usage", async () => {
    const { stdout } = await exec("node", [CLI_BIN, "help"]);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("init");
    expect(stdout).toContain("import");
    expect(stdout).toContain("run");
    expect(stdout).toContain("report");
    expect(stdout).toContain("compare");
  });

  test("unknown command exits with error", async () => {
    try {
      await exec("node", [CLI_BIN, "nonexistent"]);
      expect.unreachable("Should have thrown");
    } catch (err: unknown) {
      const error = err as { stderr: string; code: number };
      expect(error.stderr).toContain("Unknown command");
    }
  });
});
