#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "./commands/init.js";
import { importCommand } from "./commands/import.js";
import { runCommand } from "./commands/run.js";
import { reportCommand } from "./commands/report.js";
import { compareCommand } from "./commands/compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// package.json lives one level above dist/ where this compiled file runs.
const VERSION = (
  JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8")) as { version: string }
).version;

const COMMANDS: Record<string, (args: ReadonlyArray<string>) => Promise<void>> = {
  init: initCommand,
  import: importCommand,
  run: runCommand,
  report: reportCommand,
  compare: compareCommand,
};

async function main(): Promise<void> {
  const [commandName, ...commandArgs] = process.argv.slice(2);

  if (commandName === "--version") {
    // eslint-disable-next-line no-console
    console.log(`repobench ${VERSION}`);
    return;
  }

  if (commandName === undefined || commandName === "help" || commandName === "--help") {
    printUsage();
    return;
  }

  const command = COMMANDS[commandName];
  if (command === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Unknown command: ${commandName}`);
    printUsage();
    process.exit(1);
  }

  await command(commandArgs);
}

function printUsage(): void {
  // eslint-disable-next-line no-console
  console.log(`
repobench — Benchmark coding agents on your own repository history

Usage:
  repobench <command> [options]

Commands:
  init       Initialize RepoBench for a repository
  import     Import benchmark tasks from GitHub PRs
  run        Execute a benchmark run with an agent
  report     View results of a benchmark run
  compare    Compare two benchmark runs side-by-side

Options:
  --version  Show version
  --help     Show this help message
  `);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error:", err);
  process.exit(1);
});
