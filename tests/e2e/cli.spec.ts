import { beforeAll, test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const exec = promisify(execFile);
const CLI_BIN = resolve(process.cwd(), "apps/cli/dist/index.js");

beforeAll(async () => {
  await exec("pnpm", ["--filter", "@repobench/cli", "build"]);
});

test.describe("CLI", () => {
  test("--version prints version", async () => {
    const { stdout } = await exec("node", [CLI_BIN, "--version"]);
    expect(stdout.trim()).toMatch(/repobench \d+\.\d+\.\d+/);
  });

  test("init forwards command flags", async () => {
    const workingDirectory = await mkdtemp(join(tmpdir(), "repobench-cli-init-"));

    try {
      const { stdout } = await exec("node", [CLI_BIN, "init", "--repo", "owner/name"], {
        cwd: workingDirectory,
      });
      const configContent = await readFile(join(workingDirectory, ".repobench.yml"), "utf8");

      expect(stdout).toContain("Initializing RepoBench for owner/name");
      expect(stdout).toContain("Created .repobench.yml");
      expect(configContent).toContain("repo: owner/name");
      expect(configContent).toContain("source: github");
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
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

  test("run fails with fatal error when api is not running", async () => {
    try {
      await exec("node", [CLI_BIN, "run", "--agent", "claude", "--suite", "default"]);
      expect.unreachable("Should have thrown");
    } catch (err: unknown) {
      const error = err as { stderr: string; code: number };
      expect(error.stderr).toContain("Fatal error");
    }
  });
});
