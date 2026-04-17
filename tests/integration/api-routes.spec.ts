import { Queue } from "bullmq";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  AgentProfile,
  BenchmarkSuite,
  EvaluationVerdict,
  Repository,
  Run,
  RunAttempt,
  Task,
} from "../../packages/domain/src/index.js";
import type {
  AgentProfileStore,
  EvaluationVerdictStore,
  RepositoryStore,
  RunAttemptStore,
  RunStore,
  SuiteStore,
  TaskStore,
} from "../../packages/storage/src/db/repositories.js";
import { registerRepoRoutes } from "../../apps/api/src/routes/repos.js";
import { registerSuiteRoutes } from "../../apps/api/src/routes/suites.js";

const { registerRunRoutes } = await import("../../apps/api/src/routes/runs.js");

type ReplyPayload = {
  readonly statusCode: number;
  readonly body: unknown;
};

type TestReply = {
  code: (statusCode: number) => TestReply;
  send: (payload: unknown) => unknown;
  readonly statusCode: number;
  readonly payload: unknown;
};

type RouteHandler = (request: any, reply: TestReply) => Promise<unknown>;

type TestServer = Parameters<typeof registerRunRoutes>[0] & {
  readonly registeredPostRoutes: Map<string, RouteHandler>;
  readonly registeredGetRoutes: Map<string, RouteHandler>;
  readonly createdRuns: Run[];
  readonly closeServer: () => Promise<void>;
};

const repositoryFixture: Repository = {
  id: "repo-1",
  owner: "senoldogann",
  name: "spartacus",
  fullName: "senoldogann/spartacus",
  source: "github",
  cloneUrl: "https://github.com/senoldogann/spartacus.git",
  defaultBranch: "main",
  language: "TypeScript",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const suiteFixture: BenchmarkSuite = {
  id: "suite-1",
  repositoryId: repositoryFixture.id,
  name: "Suite",
  description: "Suite description",
  taskCount: 3,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const agentProfileFixture: AgentProfile = {
  id: "agent-1",
  name: "Claude Sonnet",
  provider: "claude",
  model: "claude-3-7-sonnet-20250219",
  config: {},
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

const runResultFixture: Run = {
  id: "run-results-1",
  suiteId: suiteFixture.id,
  agentProfileId: agentProfileFixture.id,
  status: "completed",
  totalTasks: 1,
  completedTasks: 1,
  passedTasks: 1,
  failedTasks: 0,
  startedAt: new Date("2024-01-02T00:00:00.000Z"),
  completedAt: new Date("2024-01-02T00:05:00.000Z"),
  createdAt: new Date("2024-01-02T00:00:00.000Z"),
};

const runAttemptFixture: RunAttempt = {
  id: "attempt-1",
  runId: runResultFixture.id,
  taskId: "task-1",
  agentProfileId: agentProfileFixture.id,
  attemptNumber: 1,
  status: "completed",
  startedAt: new Date("2024-01-02T00:00:10.000Z"),
  completedAt: new Date("2024-01-02T00:01:10.000Z"),
  patchArtifactPath: "patch.diff",
  stdoutLogPath: "stdout.log",
  stderrLogPath: "stderr.log",
  tokenCount: 321,
  estimatedCostUsd: 0.0123,
  durationMs: 60_000,
  errorMessage: null,
};

const evaluationVerdictFixture: EvaluationVerdict = {
  attemptId: runAttemptFixture.id,
  taskId: runAttemptFixture.taskId,
  runId: runResultFixture.id,
  passed: true,
  metrics: {
    attemptId: runAttemptFixture.id,
    taskId: runAttemptFixture.taskId,
    runId: runResultFixture.id,
    patchApplySuccess: true,
    buildSuccess: true,
    testSuccess: true,
    taskPass: true,
    durationMs: 60_000,
    tokenCount: 321,
    estimatedCostUsd: 0.0123,
    retryCount: 0,
    oneShot: true,
  },
  evaluatedAt: new Date("2024-01-02T00:01:11.000Z"),
};

type QueueConnection = {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly db?: number;
  readonly tls?: Record<string, never>;
};

function createQueueConnection(redisConnectionString: string): QueueConnection {
  const parsedUrl = new URL(redisConnectionString);
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

  if (parsedUrl.username.length > 0) {
    connection.username = decodeURIComponent(parsedUrl.username);
  }

  if (parsedUrl.password.length > 0) {
    connection.password = decodeURIComponent(parsedUrl.password);
  }

  if (dbPath.length > 0) {
    connection.db = parseInt(dbPath, 10);
  }

  if (parsedUrl.protocol === "rediss:") {
    connection.tls = {};
  }

  return connection;
}

function createRepoStore(): RepositoryStore {
  return {
    findById: async (id: string) => (id === repositoryFixture.id ? repositoryFixture : null),
    findByFullName: async () => null,
    create: async (repo: Repository) => repo,
    listAll: async () => [repositoryFixture],
  };
}

function createSuiteStore(): SuiteStore {
  return {
    findById: async (id: string) => (id === suiteFixture.id ? suiteFixture : null),
    findByRepository: async (repositoryId: string) =>
      repositoryId === suiteFixture.repositoryId ? [suiteFixture] : [],
    create: async (suite: BenchmarkSuite) => suite,
  };
}

function createTaskStore(): TaskStore {
  return {
    findById: async () => null,
    findBySuite: async () => [] satisfies ReadonlyArray<Task>,
    create: async (task: Task) => task,
    createMany: async (tasks: ReadonlyArray<Task>) => tasks.length,
  };
}

function createRunStore(createdRuns: Run[]): RunStore {
  return {
    findById: async (id: string) => createdRuns.find((run) => run.id === id) ?? null,
    findBySuite: async (suiteId: string) => createdRuns.filter((run) => run.suiteId === suiteId),
    create: async (run: Run) => {
      createdRuns.push(run);
      return run;
    },
    updateStatus: async () => undefined,
  };
}

function createRunAttemptStore(): RunAttemptStore {
  return {
    findByRun: async (runId: string) => (runId === runResultFixture.id ? [runAttemptFixture] : []),
    create: async (attempt: RunAttempt) => attempt,
    update: async () => undefined,
  };
}

function createEvaluationVerdictStore(): EvaluationVerdictStore {
  return {
    findByRun: async (runId: string) =>
      runId === runResultFixture.id ? [evaluationVerdictFixture] : [],
    create: async (verdict: EvaluationVerdict) => verdict,
  };
}

function createAgentProfileStore(): AgentProfileStore {
  return {
    findById: async (id: string) => (id === agentProfileFixture.id ? agentProfileFixture : null),
    findByProvider: async () => [agentProfileFixture],
    create: async (profile: AgentProfile) => profile,
    listAll: async () => [agentProfileFixture],
  };
}

function createReply(): TestReply {
  let statusCode = 200;
  let payload: unknown = undefined;

  return {
    code(nextStatusCode: number): TestReply {
      statusCode = nextStatusCode;
      return this;
    },
    send(nextPayload: unknown): unknown {
      payload = nextPayload;
      return nextPayload;
    },
    get statusCode(): number {
      return statusCode;
    },
    get payload(): unknown {
      return payload;
    },
  };
}

function createTestServer(): TestServer {
  const registeredPostRoutes = new Map<string, RouteHandler>();
  const registeredGetRoutes = new Map<string, RouteHandler>();
  const onCloseHooks: Array<() => Promise<void>> = [];
  const createdRuns: Run[] = [];

  const server = {
    post(path: string, handler: RouteHandler): void {
      registeredPostRoutes.set(path, handler);
    },
    get(path: string, handler: RouteHandler): void {
      registeredGetRoutes.set(path, handler);
    },
    addHook(name: string, handler: () => Promise<void>): void {
      if (name === "onClose") {
        onCloseHooks.push(handler);
      }
    },
    repos: createRepoStore(),
    suites: createSuiteStore(),
    tasks: createTaskStore(),
    runs: createRunStore(createdRuns),
    runAttempts: createRunAttemptStore(),
    evaluationVerdicts: createEvaluationVerdictStore(),
    agentProfiles: createAgentProfileStore(),
    registeredPostRoutes,
    registeredGetRoutes,
    createdRuns,
    closeServer: async (): Promise<void> => {
      for (const hook of onCloseHooks) {
        await hook();
      }
    },
  };

  return server as TestServer;
}

async function invokeRoute(handler: RouteHandler, request: unknown): Promise<ReplyPayload> {
  const reply = createReply();
  const result = await handler(request, reply);

  return {
    statusCode: reply.statusCode,
    body: reply.payload === undefined ? result : reply.payload,
  };
}

describe("API route validation and queueing", () => {
  let previousRedisUrl: string | undefined;
  let queue: Queue | null;

  beforeEach(async () => {
    previousRedisUrl = process.env["REDIS_URL"];
    process.env["REDIS_URL"] = "redis://127.0.0.1:6379/15";
    queue = new Queue("benchmark-run", {
      connection: createQueueConnection(process.env["REDIS_URL"]),
    });
    await queue.drain(true);
  });

  afterEach(async () => {
    if (queue !== null) {
      await queue.close();
      queue = null;
    }

    if (previousRedisUrl === undefined) {
      delete process.env["REDIS_URL"];
      return;
    }

    process.env["REDIS_URL"] = previousRedisUrl;
  });

  it("returns 400 for missing repo, suite, and run bodies", async () => {
    const server = createTestServer();
    registerRepoRoutes(server);
    registerSuiteRoutes(server);
    registerRunRoutes(server);

    const createRepoHandler = server.registeredPostRoutes.get("/api/repos");
    const createSuiteHandler = server.registeredPostRoutes.get("/api/repos/:repoId/suites");
    const createRunHandler = server.registeredPostRoutes.get("/api/suites/:suiteId/runs");

    if (
      createRepoHandler === undefined ||
      createSuiteHandler === undefined ||
      createRunHandler === undefined
    ) {
      throw new Error("Expected route handlers to be registered");
    }

    const repoResponse = await invokeRoute(createRepoHandler, { body: undefined });
    const suiteResponse = await invokeRoute(createSuiteHandler, {
      params: { repoId: repositoryFixture.id },
      body: undefined,
    });
    const runResponse = await invokeRoute(createRunHandler, {
      params: { suiteId: suiteFixture.id },
      body: undefined,
    });

    expect(repoResponse).toEqual({
      statusCode: 400,
      body: { error: "owner and name are required" },
    });
    expect(suiteResponse).toEqual({
      statusCode: 400,
      body: { error: "name is required" },
    });
    expect(runResponse).toEqual({
      statusCode: 400,
      body: { error: "agentProfileId is required" },
    });

    await server.closeServer();
  });

  it("creates a queued run and enqueues the benchmark job", async () => {
    const server = createTestServer();
    registerRunRoutes(server);

    const createRunHandler = server.registeredPostRoutes.get("/api/suites/:suiteId/runs");
    if (createRunHandler === undefined) {
      throw new Error("Expected run creation handler to be registered");
    }

    const response = await invokeRoute(createRunHandler, {
      params: { suiteId: suiteFixture.id },
      body: { agentProfileId: agentProfileFixture.id },
    });

    expect(response.statusCode).toBe(201);
    expect(server.createdRuns).toHaveLength(1);

    const createdRun = server.createdRuns[0];
    if (createdRun === undefined) {
      throw new Error("Expected a created run");
    }

    expect(createdRun.status).toBe("queued");
    expect(createdRun.totalTasks).toBe(suiteFixture.taskCount);
    if (queue === null) {
      throw new Error("Expected a queue connection");
    }

    const job = await queue.getJob(createdRun.id);
    expect(job).not.toBeNull();
    expect(job?.data).toEqual({
      runId: createdRun.id,
      suiteId: suiteFixture.id,
      agentProfileId: agentProfileFixture.id,
    });

    await server.closeServer();
  });

  it("returns persisted attempts and verdicts from the run results endpoint", async () => {
    const server = createTestServer();
    server.createdRuns.push(runResultFixture);
    registerRunRoutes(server);

    const resultsHandler = server.registeredGetRoutes.get("/api/runs/:id/results");
    if (resultsHandler === undefined) {
      throw new Error("Expected run results handler to be registered");
    }

    const response = await invokeRoute(resultsHandler, {
      params: { id: runResultFixture.id },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      run: runResultFixture,
      summary: {
        totalTasks: 1,
        completedTasks: 1,
        passedTasks: 1,
        failedTasks: 0,
        passRate: 1,
      },
      attempts: [runAttemptFixture],
      verdicts: [evaluationVerdictFixture],
    });

    await server.closeServer();
  });
});
