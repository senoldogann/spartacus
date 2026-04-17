import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  createDatabaseConnection,
  createEvaluationVerdictStore,
  createRepositoryStore,
  createRunAttemptStore,
  createSuiteStore,
  createTaskStore,
  createRunStore,
  createAgentProfileStore,
} from "@repobench/storage";
import type {
  EvaluationVerdictStore,
  RepositoryStore,
  RunAttemptStore,
  SuiteStore,
  TaskStore,
  RunStore,
  AgentProfileStore,
} from "@repobench/storage";

declare module "fastify" {
  interface FastifyInstance {
    repos: RepositoryStore;
    suites: SuiteStore;
    tasks: TaskStore;
    runs: RunStore;
    runAttempts: RunAttemptStore;
    evaluationVerdicts: EvaluationVerdictStore;
    agentProfiles: AgentProfileStore;
  }
}

function validateDatabaseUrl(databaseUrl: string): void {
  try {
    new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL");
  }
}

/**
 * Connects to Postgres, runs schema migration, and decorates Fastify with stores.
 */
const dbPluginImpl: FastifyPluginAsync = async (server) => {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  validateDatabaseUrl(databaseUrl);

  const db = await createDatabaseConnection(databaseUrl);

  server.decorate("repos", createRepositoryStore(db.sql));
  server.decorate("suites", createSuiteStore(db.sql));
  server.decorate("tasks", createTaskStore(db.sql));
  server.decorate("runs", createRunStore(db.sql));
  server.decorate("runAttempts", createRunAttemptStore(db.sql));
  server.decorate("evaluationVerdicts", createEvaluationVerdictStore(db.sql));
  server.decorate("agentProfiles", createAgentProfileStore(db.sql));

  server.addHook("onClose", async () => {
    await db.close();
  });
};

export const dbPlugin = fp(dbPluginImpl, { name: "db" });
