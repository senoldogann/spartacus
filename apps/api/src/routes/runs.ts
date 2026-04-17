import { randomUUID } from "node:crypto";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { Queue } from "bullmq";
import type { FastifyInstance } from "fastify";
import type { Run, RunAttempt } from "@repobench/domain";

type CreateRunBody = {
  readonly agentProfileId: string;
};

type BenchmarkRunJob = {
  readonly runId: string;
  readonly suiteId: string;
  readonly agentProfileId: string;
};

type RedisConnectionOptions = {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly db?: number;
  readonly tls?: Record<string, never>;
};

const ARTIFACTS_ROOT = resolve(
  process.env["ARTIFACTS_DIR"] ?? join(process.cwd(), ".repobench-artifacts"),
);
const REDACTED_VALUE = "[REDACTED]";
const SECRET_ENV_VAR_NAMES = [
  "GITHUB_TOKEN",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "API_AUTH_TOKEN",
  "DATABASE_URL",
  "REDIS_URL",
  "ARTIFACT_STORE_SECRET_KEY",
] as const;

function sanitizeText(value: string): string {
  const credentialSanitized = value.replaceAll(
    /https:\/\/([^/\s:@]+):([^@\s]+)@/gu,
    `https://$1:${REDACTED_VALUE}@`,
  );

  return SECRET_ENV_VAR_NAMES.reduce((currentValue, envVarName) => {
    const secretValue = process.env[envVarName];

    if (secretValue === undefined || secretValue.length === 0) {
      return currentValue;
    }

    return currentValue.split(secretValue).join(REDACTED_VALUE);
  }, credentialSanitized);
}

function sanitizeArtifactReference(reference: string | null): string | null {
  if (reference === null) {
    return null;
  }

  if (!isAbsolute(reference)) {
    return reference;
  }

  const relativePath = relative(ARTIFACTS_ROOT, reference);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return basename(reference);
  }

  return relativePath;
}

function sanitizeAttemptForResponse(attempt: RunAttempt): RunAttempt {
  return {
    ...attempt,
    patchArtifactPath: sanitizeArtifactReference(attempt.patchArtifactPath),
    stdoutLogPath: sanitizeArtifactReference(attempt.stdoutLogPath),
    stderrLogPath: sanitizeArtifactReference(attempt.stderrLogPath),
    errorMessage: attempt.errorMessage !== null ? sanitizeText(attempt.errorMessage) : null,
  };
}

function getRequiredRedisUrl(): string {
  const redisUrl = process.env["REDIS_URL"];
  if (redisUrl === undefined || redisUrl.trim().length === 0) {
    throw new Error("REDIS_URL environment variable is required");
  }

  return redisUrl;
}

function createRedisConnectionOptions(redisConnectionString: string): RedisConnectionOptions {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(redisConnectionString);
  } catch {
    throw new Error("REDIS_URL must be a valid URL");
  }

  const dbPath = parsedUrl.pathname.replace(/^\//u, "");
  const connection: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
    tls?: Record<string, never>;
  } = {
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port === "" ? "6379" : parsedUrl.port, 10),
  };

  if (Number.isNaN(connection.port)) {
    throw new Error("REDIS_URL port must be a valid number");
  }

  if (parsedUrl.username.length > 0) {
    connection.username = decodeURIComponent(parsedUrl.username);
  }

  if (parsedUrl.password.length > 0) {
    connection.password = decodeURIComponent(parsedUrl.password);
  }

  if (dbPath.length > 0) {
    const db = parseInt(dbPath, 10);
    if (Number.isNaN(db)) {
      throw new Error("REDIS_URL database must be a valid number");
    }

    connection.db = db;
  }

  if (parsedUrl.protocol === "rediss:") {
    connection.tls = {};
  }

  return connection;
}

function parseCreateRunBody(body: unknown): CreateRunBody | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const agentProfileId = candidate["agentProfileId"];

  if (typeof agentProfileId !== "string") {
    return null;
  }

  return { agentProfileId };
}

/**
 * Benchmark run management endpoints.
 */
export function registerRunRoutes(server: FastifyInstance): void {
  const queue = new Queue<BenchmarkRunJob>("benchmark-run", {
    connection: createRedisConnectionOptions(getRequiredRedisUrl()),
  });

  server.addHook("onClose", async () => {
    await queue.close();
  });

  server.post<{ Params: { suiteId: string }; Body: CreateRunBody }>(
    "/api/suites/:suiteId/runs",
    async (request, reply) => {
      const { suiteId } = request.params;
      const body = parseCreateRunBody(request.body);

      if (body === null) {
        return reply.code(400).send({ error: "agentProfileId is required" });
      }

      const { agentProfileId } = body;

      if (typeof agentProfileId !== "string" || agentProfileId.trim().length === 0) {
        return reply.code(400).send({ error: "agentProfileId is required" });
      }

      const suite = await server.suites.findById(suiteId);
      if (suite === null) {
        return reply.code(404).send({ error: "Suite not found" });
      }

      const agent = await server.agentProfiles.findById(agentProfileId);
      if (agent === null) {
        return reply.code(404).send({ error: "Agent profile not found" });
      }

      const run: Run = {
        id: randomUUID(),
        suiteId,
        agentProfileId,
        status: "queued",
        totalTasks: suite.taskCount,
        completedTasks: 0,
        passedTasks: 0,
        failedTasks: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      };

      const created = await server.runs.create(run);
      try {
        await queue.add(
          created.id,
          {
            runId: created.id,
            suiteId,
            agentProfileId,
          },
          { jobId: created.id },
        );
      } catch (error: unknown) {
        // If queuing fails, mark the run as failed so it is not permanently stuck
        // in "queued" with no corresponding BullMQ job to process it.
        try {
          await server.runs.updateStatus(created.id, "failed", {
            completedTasks: 0,
            passedTasks: 0,
            failedTasks: 0,
          });
        } catch (updateError: unknown) {
          server.log.error(
            { runId: created.id, updateError },
            "Failed to mark run as failed after queue enqueue error; run may be stuck in queued state",
          );
        }

        throw error;
      }

      return reply.code(201).send({ run: created });
    },
  );

  server.get<{ Params: { id: string } }>("/api/runs/:id", async (request, reply) => {
    const run = await server.runs.findById(request.params.id);
    if (run === null) {
      return reply.code(404).send({ error: "Run not found" });
    }
    return { run };
  });

  server.get<{ Params: { suiteId: string } }>("/api/suites/:suiteId/runs", async (request) => {
    const runs = await server.runs.findBySuite(request.params.suiteId);
    return { runs };
  });

  server.get<{ Params: { id: string } }>("/api/runs/:id/results", async (request, reply) => {
    const run = await server.runs.findById(request.params.id);
    if (run === null) {
      return reply.code(404).send({ error: "Run not found" });
    }

    const [attempts, verdicts] = await Promise.all([
      server.runAttempts.findByRun(run.id),
      server.evaluationVerdicts.findByRun(run.id),
    ]);

    return {
      run,
      summary: {
        totalTasks: run.totalTasks,
        completedTasks: run.completedTasks,
        passedTasks: run.passedTasks,
        failedTasks: run.failedTasks,
        passRate: run.completedTasks > 0 ? run.passedTasks / run.completedTasks : 0,
      },
      attempts: attempts.map((attempt) => sanitizeAttemptForResponse(attempt)),
      verdicts,
    };
  });
}
