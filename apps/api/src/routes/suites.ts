import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { BenchmarkSuite } from "@repobench/domain";
import { validateTestCommand } from "@repobench/evaluator";
import { createSnapshot, fetchMergedPrs } from "@repobench/repo-ingest";
import { filterBugfixCandidates, buildBugfixTask } from "@repobench/task-builder";
import type { PaginationParams } from "@repobench/storage";

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawLimit = query["limit"];
  const rawOffset = query["offset"];
  const limit =
    typeof rawLimit === "string"
      ? Math.min(parseInt(rawLimit, 10) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;
  const offset = typeof rawOffset === "string" ? Math.max(parseInt(rawOffset, 10) || 0, 0) : 0;
  return { limit, offset };
}

type CreateSuiteBody = {
  readonly name: string;
  readonly description?: string;
  readonly maxPrs?: number;
  readonly testCommand?: string;
};

function parseCreateSuiteBody(body: unknown): CreateSuiteBody | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const name = candidate["name"];
  const description = candidate["description"];
  const maxPrs = candidate["maxPrs"];
  const testCommand = candidate["testCommand"];

  if (typeof name !== "string") {
    return null;
  }

  if (description !== undefined && typeof description !== "string") {
    return null;
  }

  if (maxPrs !== undefined && typeof maxPrs !== "number") {
    return null;
  }

  if (maxPrs !== undefined && (maxPrs < 1 || maxPrs > 200)) {
    return null;
  }

  if (testCommand !== undefined && typeof testCommand !== "string") {
    return null;
  }

  return {
    name,
    description,
    maxPrs,
    testCommand,
  };
}

const createSuiteSchema = {
  body: {
    type: "object" as const,
    required: ["name", "testCommand"],
    properties: {
      name: { type: "string" as const, minLength: 1 },
      description: { type: "string" as const },
      maxPrs: { type: "integer" as const, minimum: 1, maximum: 200 },
      testCommand: { type: "string" as const, minLength: 1 },
    },
    additionalProperties: false,
  },
};

/**
 * Benchmark suite management endpoints.
 */
export function registerSuiteRoutes(server: FastifyInstance): void {
  server.get<{ Params: { repoId: string } }>("/api/repos/:repoId/suites", async (request) => {
    const pagination = parsePagination(request.query as Record<string, unknown>);
    const suites = await server.suites.findByRepository(request.params.repoId, pagination);
    return { suites };
  });

  server.get<{ Params: { id: string } }>("/api/suites/:id", async (request, reply) => {
    const suite = await server.suites.findById(request.params.id);
    if (suite === null) {
      return reply.code(404).send({ error: "Suite not found" });
    }
    const tasks = await server.tasks.findBySuite(suite.id);
    return { suite, tasks };
  });

  server.post<{ Params: { repoId: string }; Body: CreateSuiteBody }>(
    "/api/repos/:repoId/suites",
    { schema: createSuiteSchema },
    async (request, reply) => {
      const { repoId } = request.params;
      const body = parseCreateSuiteBody(request.body);

      if (body === null) {
        return reply.code(400).send({ error: "name is required" });
      }

      const { name, description, maxPrs, testCommand } = body;

      if (typeof name !== "string" || name.trim().length === 0) {
        return reply.code(400).send({ error: "name is required" });
      }

      const repo = await server.repos.findById(repoId);
      if (repo === null) {
        return reply.code(404).send({ error: "Repository not found" });
      }

      if (testCommand === undefined) {
        return reply.code(400).send({
          error:
            'testCommand is required. Specify the shell command to run tests (e.g. "npm test", "pytest").',
        });
      }

      const resolvedTestCommand = testCommand;
      try {
        validateTestCommand(resolvedTestCommand);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return reply.code(400).send({ error: message });
      }

      const token = process.env["GITHUB_TOKEN"];
      if (token === undefined || token.trim().length === 0) {
        return reply.code(500).send({ error: "GITHUB_TOKEN not configured" });
      }

      // Fetch and filter PRs
      const prs = await fetchMergedPrs(repo.owner, repo.name, token, maxPrs ?? 50);
      const candidates = filterBugfixCandidates(prs);

      if (candidates.length === 0) {
        return reply.code(422).send({ error: "No suitable bugfix PRs found" });
      }

      const suiteId = randomUUID();
      const tasks = await Promise.all(
        candidates.map(async (candidate) => {
          const snapshot = await createSnapshot(
            repo.owner,
            repo.name,
            candidate.prNumber,
            candidate.baseSha,
            candidate.headSha,
            token,
            resolvedTestCommand,
          );

          return buildBugfixTask(suiteId, repoId, candidate, snapshot);
        }),
      );

      const suite: BenchmarkSuite = {
        id: suiteId,
        repositoryId: repoId,
        name,
        description: description ?? "",
        taskCount: tasks.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = await server.suites.create(suite);

      try {
        await server.tasks.createMany(tasks);
      } catch (error: unknown) {
        // Compensating action: remove the suite row to avoid an orphaned
        // suite that reports taskCount > 0 but has no task rows.
        try {
          await server.suites.deleteById(created.id);
        } catch {
          // Best-effort cleanup; log and continue to rethrow original error.
          server.log.error(
            { suiteId: created.id },
            "Failed to delete orphaned suite after task creation error",
          );
        }
        throw error;
      }

      return reply.code(201).send({ suite: created, taskCount: tasks.length });
    },
  );
}
