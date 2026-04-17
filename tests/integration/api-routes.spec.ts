import { Queue } from "bullmq";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { registerAgentProfileRoutes } from "../../apps/api/src/routes/agent-profiles.js";
import { registerCompareRoutes } from "../../apps/api/src/routes/compare.js";
import { registerRepoRoutes } from "../../apps/api/src/routes/repos.js";
import { registerSuiteRoutes } from "../../apps/api/src/routes/suites.js";

const { registerRunRoutes } = await import("../../apps/api/src/routes/runs.js");

type ReplyPayload = {
    readonly statusCode: number;
    readonly body: unknown;
};

type TestReply = {
    code: (statusCode: number) => TestReply;
    type: (_contentType: string) => TestReply;
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
    executionMode: "hosted",
    runtimeConfig: {
        transport: "provider-api",
    },
    config: {},
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

const runResultFixture: Run = {
    id: "run-results-1",
    suiteId: suiteFixture.id,
    agentProfileId: agentProfileFixture.id,
    status: "completed",
    totalTasks: 4,
    completedTasks: 2,
    passedTasks: 1,
    failedTasks: 1,
    startedAt: new Date("2024-01-02T00:00:00.000Z"),
    completedAt: new Date("2024-01-02T00:05:00.000Z"),
    createdAt: new Date("2024-01-02T00:00:00.000Z"),
};

const comparisonRunFixture: Run = {
    id: "run-results-2",
    suiteId: suiteFixture.id,
    agentProfileId: agentProfileFixture.id,
    status: "completed",
    totalTasks: 4,
    completedTasks: 4,
    passedTasks: 3,
    failedTasks: 1,
    startedAt: new Date("2024-01-03T00:00:00.000Z"),
    completedAt: new Date("2024-01-03T00:05:00.000Z"),
    createdAt: new Date("2024-01-03T00:00:00.000Z"),
};

const crossSuiteRunFixture: Run = {
    id: "run-results-3",
    suiteId: "suite-2",
    agentProfileId: agentProfileFixture.id,
    status: "completed",
    totalTasks: 4,
    completedTasks: 4,
    passedTasks: 4,
    failedTasks: 0,
    startedAt: new Date("2024-01-04T00:00:00.000Z"),
    completedAt: new Date("2024-01-04T00:05:00.000Z"),
    createdAt: new Date("2024-01-04T00:00:00.000Z"),
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
    patchArtifactPath: "runs/run-results-1/tasks/task-1/attempts/attempt-1/patch.diff",
    stdoutLogPath: "runs/run-results-1/tasks/task-1/attempts/attempt-1/stdout.log",
    stderrLogPath: "runs/run-results-1/tasks/task-1/attempts/attempt-1/stderr.log",
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
        deleteById: async () => undefined,
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

function createRunAttemptStore(runAttempt: RunAttempt): RunAttemptStore {
    return {
        findByRun: async (runId: string) => (runId === runResultFixture.id ? [runAttempt] : []),
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

function createAgentProfileStore(
    initialAgentProfiles: ReadonlyArray<AgentProfile>,
): AgentProfileStore {
    const agentProfiles: AgentProfile[] = [...initialAgentProfiles];

    return {
        findById: async (id: string) => agentProfiles.find((profile) => profile.id === id) ?? null,
        findByProvider: async (provider: AgentProfile["provider"]) =>
            agentProfiles.filter((profile) => profile.provider === provider),
        create: async (profile: AgentProfile) => {
            agentProfiles.push(profile);
            return profile;
        },
        listAll: async () => [...agentProfiles],
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
        type(): TestReply {
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

function createTestServer(
    options: {
        readonly runAttempt?: RunAttempt;
        readonly agentProfiles?: ReadonlyArray<AgentProfile>;
    } = {},
): TestServer {
    const registeredPostRoutes = new Map<string, RouteHandler>();
    const registeredGetRoutes = new Map<string, RouteHandler>();
    const onCloseHooks: Array<() => Promise<void>> = [];
    const createdRuns: Run[] = [];
    const runAttempt = options.runAttempt ?? runAttemptFixture;
    const agentProfiles = options.agentProfiles ?? [agentProfileFixture];

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
        runAttempts: createRunAttemptStore(runAttempt),
        evaluationVerdicts: createEvaluationVerdictStore(),
        agentProfiles: createAgentProfileStore(agentProfiles),
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
    let previousAllowHostedAgentExecution: string | undefined;
    let previousAnthropicApiKey: string | undefined;
    let previousOpenAiApiKey: string | undefined;
    let previousOpenSourceApiKey: string | undefined;
    let queue: Queue | null;

    beforeEach(async () => {
        previousRedisUrl = process.env["REDIS_URL"];
        previousAllowHostedAgentExecution = process.env["ALLOW_HOSTED_AGENT_EXECUTION"];
        previousAnthropicApiKey = process.env["ANTHROPIC_API_KEY"];
        previousOpenAiApiKey = process.env["OPENAI_API_KEY"];
        previousOpenSourceApiKey = process.env["OPEN_SOURCE_API_KEY"];
        process.env["REDIS_URL"] = "redis://127.0.0.1:6379/15";
        process.env["ALLOW_HOSTED_AGENT_EXECUTION"] = "true";
        process.env["ANTHROPIC_API_KEY"] = "test-anthropic-key";
        process.env["OPENAI_API_KEY"] = "test-openai-key";
        process.env["OPEN_SOURCE_API_KEY"] = "test-open-source-key";
        queue = new Queue("benchmark-run", {
            connection: createQueueConnection(process.env["REDIS_URL"]),
        });
        await queue.drain(true);
        await mkdir(join(process.cwd(), ".repobench-artifacts"), { recursive: true });
    });

    afterEach(async () => {
        if (queue !== null) {
            await queue.close();
            queue = null;
        }

        if (previousRedisUrl === undefined) {
            delete process.env["REDIS_URL"];
        } else {
            process.env["REDIS_URL"] = previousRedisUrl;
        }

        if (previousAllowHostedAgentExecution === undefined) {
            delete process.env["ALLOW_HOSTED_AGENT_EXECUTION"];
        } else {
            process.env["ALLOW_HOSTED_AGENT_EXECUTION"] = previousAllowHostedAgentExecution;
        }

        if (previousAnthropicApiKey === undefined) {
            delete process.env["ANTHROPIC_API_KEY"];
        } else {
            process.env["ANTHROPIC_API_KEY"] = previousAnthropicApiKey;
        }

        if (previousOpenAiApiKey === undefined) {
            delete process.env["OPENAI_API_KEY"];
        } else {
            process.env["OPENAI_API_KEY"] = previousOpenAiApiKey;
        }

        if (previousOpenSourceApiKey === undefined) {
            delete process.env["OPEN_SOURCE_API_KEY"];
        } else {
            process.env["OPEN_SOURCE_API_KEY"] = previousOpenSourceApiKey;
        }

        await rm(join(process.cwd(), ".repobench-artifacts"), { recursive: true, force: true });
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
        expect(job?.opts.attempts).toBe(3);
        expect(job?.opts.backoff).toEqual({ type: "exponential", delay: 1_000 });

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
                totalTasks: 4,
                completedTasks: 2,
                passedTasks: 1,
                failedTasks: 1,
                completionRate: 0.5,
                passRate: 0.25,
            },
            attempts: [runAttemptFixture],
            verdicts: [evaluationVerdictFixture],
        });

        await server.closeServer();
    });

    it("lists and creates agent profiles", async () => {
        const server = createTestServer();
        registerAgentProfileRoutes(server);

        const listHandler = server.registeredGetRoutes.get("/api/agent-profiles");
        const createHandler = server.registeredPostRoutes.get("/api/agent-profiles");
        if (listHandler === undefined || createHandler === undefined) {
            throw new Error("Expected agent profile routes to be registered");
        }

        const initialListResponse = await invokeRoute(listHandler, {});
        expect(initialListResponse.statusCode).toBe(200);
        expect(initialListResponse.body).toEqual({
            agentProfiles: [agentProfileFixture],
        });

        const createResponse = await invokeRoute(createHandler, {
            body: {
                name: "Codex",
                provider: "codex",
                model: "gpt-5.3-codex",
                executionMode: "hosted",
                runtimeConfig: {
                    transport: "provider-api",
                },
                config: { temperature: 0 },
            },
        });
        expect(createResponse.statusCode).toBe(201);

        const createdBody = createResponse.body as { agentProfile: AgentProfile };
        expect(createdBody.agentProfile.name).toBe("Codex");
        expect(createdBody.agentProfile.provider).toBe("codex");
        expect(createdBody.agentProfile.model).toBe("gpt-5.3-codex");
        expect(createdBody.agentProfile.executionMode).toBe("hosted");
        expect(createdBody.agentProfile.runtimeConfig).toEqual({ transport: "provider-api" });
        expect(createdBody.agentProfile.config).toEqual({ temperature: 0 });

        const finalListResponse = await invokeRoute(listHandler, {});
        expect(finalListResponse.statusCode).toBe(200);
        expect(finalListResponse.body).toEqual({
            agentProfiles: [agentProfileFixture, createdBody.agentProfile],
        });
    });

    it("rejects non-loopback local model endpoints", async () => {
        const server = createTestServer();
        registerAgentProfileRoutes(server);

        const createHandler = server.registeredPostRoutes.get("/api/agent-profiles");
        if (createHandler === undefined) {
            throw new Error("Expected agent profile create route to be registered");
        }

        const response = await invokeRoute(createHandler, {
            body: {
                name: "Remote OSS",
                provider: "open-source",
                model: "qwen2.5-coder:32b",
                executionMode: "local",
                runtimeConfig: {
                    transport: "openai-compatible-http",
                    baseUrl: "https://remote.example/v1",
                },
            },
        });

        expect(response).toEqual({
            statusCode: 400,
            body: {
                error:
                    "Local open-source execution requires a loopback runtimeConfig.baseUrl (localhost/127.0.0.1/::1)",
            },
        });
    });

    it("accepts IPv6 loopback local model endpoints", async () => {
        const server = createTestServer();
        registerAgentProfileRoutes(server);

        const createHandler = server.registeredPostRoutes.get("/api/agent-profiles");
        if (createHandler === undefined) {
            throw new Error("Expected agent profile create route to be registered");
        }

        const response = await invokeRoute(createHandler, {
            body: {
                name: "IPv6 OSS",
                provider: "open-source",
                model: "qwen2.5-coder:32b",
                executionMode: "local",
                runtimeConfig: {
                    transport: "openai-compatible-http",
                    baseUrl: "http://[::1]:11434/v1",
                },
            },
        });

        expect(response.statusCode).toBe(201);
    });

    it("rejects arbitrary credential env vars in agent profile requests", async () => {
        const server = createTestServer();
        registerAgentProfileRoutes(server);

        const createHandler = server.registeredPostRoutes.get("/api/agent-profiles");
        if (createHandler === undefined) {
            throw new Error("Expected agent profile create route to be registered");
        }

        const response = await invokeRoute(createHandler, {
            body: {
                name: "Unsafe Codex",
                provider: "codex",
                model: "gpt-5.3-codex",
                executionMode: "hosted",
                runtimeConfig: {
                    transport: "provider-api",
                    apiKeyEnvVar: "DATABASE_URL",
                },
            },
        });

        expect(response).toEqual({
            statusCode: 400,
            body: {
                error: "runtimeConfig.apiKeyEnvVar must be OPENAI_API_KEY",
            },
        });
    });

    it("rejects cross-suite comparisons and reports total-task rates", async () => {
        const server = createTestServer();
        server.createdRuns.push(runResultFixture, comparisonRunFixture, crossSuiteRunFixture);
        registerCompareRoutes(server);

        const compareHandler = server.registeredGetRoutes.get("/api/compare");
        const reportHandler = server.registeredGetRoutes.get("/api/runs/:id/report");
        if (compareHandler === undefined || reportHandler === undefined) {
            throw new Error("Expected compare routes to be registered");
        }

        const compareResponse = await invokeRoute(compareHandler, {
            query: { runA: runResultFixture.id, runB: comparisonRunFixture.id },
        });
        expect(compareResponse.statusCode).toBe(200);
        expect(compareResponse.body).toEqual({
            comparison: {
                suiteId: suiteFixture.id,
                runA: {
                    id: runResultFixture.id,
                    status: runResultFixture.status,
                    totalTasks: 4,
                    completedTasks: 2,
                    passedTasks: 1,
                    failedTasks: 1,
                    completionRate: 0.5,
                    passRate: 0.25,
                },
                runB: {
                    id: comparisonRunFixture.id,
                    status: comparisonRunFixture.status,
                    totalTasks: 4,
                    completedTasks: 4,
                    passedTasks: 3,
                    failedTasks: 1,
                    completionRate: 1,
                    passRate: 0.75,
                },
            },
        });

        const crossSuiteResponse = await invokeRoute(compareHandler, {
            query: { runA: runResultFixture.id, runB: crossSuiteRunFixture.id },
        });
        expect(crossSuiteResponse).toEqual({
            statusCode: 422,
            body: { error: "Runs must belong to the same suite" },
        });

        const reportResponse = await invokeRoute(reportHandler, {
            params: { id: runResultFixture.id },
        });
        expect(reportResponse.statusCode).toBe(200);
        expect(reportResponse.body).toEqual({
            report: {
                runId: runResultFixture.id,
                suiteId: runResultFixture.suiteId,
                agentProfileId: runResultFixture.agentProfileId,
                status: runResultFixture.status,
                totalTasks: 4,
                completedTasks: 2,
                passedTasks: 1,
                failedTasks: 1,
                completionRate: 0.5,
                passRate: 0.25,
                createdAt: runResultFixture.createdAt,
                completedAt: runResultFixture.completedAt,
            },
        });
    });

    it("rejects unsupported suite test commands before import work starts", async () => {
        const server = createTestServer();
        registerSuiteRoutes(server);

        const createSuiteHandler = server.registeredPostRoutes.get("/api/repos/:repoId/suites");
        if (createSuiteHandler === undefined) {
            throw new Error("Expected suite creation handler to be registered");
        }

        const response = await invokeRoute(createSuiteHandler, {
            params: { repoId: repositoryFixture.id },
            body: {
                name: "default",
                testCommand: 'pnpm --filter "@repobench/api" test',
            },
        });

        expect(response).toEqual({
            statusCode: 400,
            body: {
                error:
                    "testCommand contains unsupported shell characters; use a simple command with space-delimited arguments",
            },
        });
    });

    it("serves persisted attempt artifacts", async () => {
        const server = createTestServer();
        server.createdRuns.push(runResultFixture);
        registerRunRoutes(server);

        const artifactHandler = server.registeredGetRoutes.get(
            "/api/runs/:id/attempts/:attemptId/artifacts/:artifactKind",
        );
        if (artifactHandler === undefined) {
            throw new Error("Expected artifact route to be registered");
        }

        await mkdir(
            join(
                process.cwd(),
                ".repobench-artifacts",
                "runs",
                "run-results-1",
                "tasks",
                "task-1",
                "attempts",
                "attempt-1",
            ),
            {
                recursive: true,
            },
        );
        await writeFile(
            join(
                process.cwd(),
                ".repobench-artifacts",
                "runs",
                "run-results-1",
                "tasks",
                "task-1",
                "attempts",
                "attempt-1",
                "stdout.log",
            ),
            "artifact stdout",
            "utf8",
        );

        const response = await invokeRoute(artifactHandler, {
            params: {
                id: runResultFixture.id,
                attemptId: runAttemptFixture.id,
                artifactKind: "stdout",
            },
        });

        expect(response).toEqual({
            statusCode: 200,
            body: "artifact stdout",
        });

        await server.closeServer();
    });

    it("redacts configured secrets from downloadable log artifacts", async () => {
        const server = createTestServer();
        server.createdRuns.push(runResultFixture);
        registerRunRoutes(server);

        const artifactHandler = server.registeredGetRoutes.get(
            "/api/runs/:id/attempts/:attemptId/artifacts/:artifactKind",
        );
        if (artifactHandler === undefined) {
            throw new Error("Expected artifact route to be registered");
        }

        await mkdir(
            join(
                process.cwd(),
                ".repobench-artifacts",
                "runs",
                "run-results-1",
                "tasks",
                "task-1",
                "attempts",
                "attempt-1",
            ),
            {
                recursive: true,
            },
        );
        await writeFile(
            join(
                process.cwd(),
                ".repobench-artifacts",
                "runs",
                "run-results-1",
                "tasks",
                "task-1",
                "attempts",
                "attempt-1",
                "stderr.log",
            ),
            "Authorization: Bearer test-open-source-key",
            "utf8",
        );

        const response = await invokeRoute(artifactHandler, {
            params: {
                id: runResultFixture.id,
                attemptId: runAttemptFixture.id,
                artifactKind: "stderr",
            },
        });

        expect(response).toEqual({
            statusCode: 200,
            body: "Authorization: Bearer [REDACTED]",
        });

        await server.closeServer();
    });

    it("serves legacy absolute-path attempt artifacts", async () => {
        const legacyArtifactsDirectory = join(
            process.cwd(),
            ".repobench-artifacts",
            "legacy",
            "attempt-1",
        );
        const legacyStdoutPath = join(legacyArtifactsDirectory, "stdout.log");
        await mkdir(legacyArtifactsDirectory, { recursive: true });
        await writeFile(legacyStdoutPath, "legacy artifact stdout", "utf8");

        const server = createTestServer({
            runAttempt: {
                ...runAttemptFixture,
                stdoutLogPath: legacyStdoutPath,
            },
        });
        server.createdRuns.push(runResultFixture);
        registerRunRoutes(server);

        const artifactHandler = server.registeredGetRoutes.get(
            "/api/runs/:id/attempts/:attemptId/artifacts/:artifactKind",
        );
        if (artifactHandler === undefined) {
            throw new Error("Expected artifact route to be registered");
        }

        const response = await invokeRoute(artifactHandler, {
            params: {
                id: runResultFixture.id,
                attemptId: runAttemptFixture.id,
                artifactKind: "stdout",
            },
        });

        expect(response).toEqual({
            statusCode: 200,
            body: "legacy artifact stdout",
        });

        await server.closeServer();
    });

    it("returns 404 for legacy absolute-path artifacts outside the artifact root", async () => {
        const legacyArtifactsDirectory = await mkdtemp(join(tmpdir(), "repobench-legacy-artifacts-"));
        const legacyStdoutPath = join(legacyArtifactsDirectory, "stdout.log");
        await writeFile(legacyStdoutPath, "legacy artifact stdout", "utf8");

        const server = createTestServer({
            runAttempt: {
                ...runAttemptFixture,
                stdoutLogPath: legacyStdoutPath,
            },
        });
        server.createdRuns.push(runResultFixture);
        registerRunRoutes(server);

        const artifactHandler = server.registeredGetRoutes.get(
            "/api/runs/:id/attempts/:attemptId/artifacts/:artifactKind",
        );
        if (artifactHandler === undefined) {
            throw new Error("Expected artifact route to be registered");
        }

        const response = await invokeRoute(artifactHandler, {
            params: {
                id: runResultFixture.id,
                attemptId: runAttemptFixture.id,
                artifactKind: "stdout",
            },
        });

        expect(response).toEqual({
            statusCode: 404,
            body: {
                error: "Artifact not found",
            },
        });

        await server.closeServer();
        await rm(legacyArtifactsDirectory, { recursive: true, force: true });
    });

    it("rejects runs created from invalid stored agent profiles", async () => {
        const invalidStoredProfile: AgentProfile = {
            ...agentProfileFixture,
            runtimeConfig: {
                transport: "provider-api",
                apiKeyEnvVar: "DATABASE_URL",
            },
        };

        const server = createTestServer({
            agentProfiles: [invalidStoredProfile],
        });
        registerRunRoutes(server);

        const createRunHandler = server.registeredPostRoutes.get("/api/suites/:suiteId/runs");
        if (createRunHandler === undefined) {
            throw new Error("Expected run creation handler to be registered");
        }

        const response = await invokeRoute(createRunHandler, {
            params: { suiteId: suiteFixture.id },
            body: { agentProfileId: invalidStoredProfile.id },
        });

        expect(response).toEqual({
            statusCode: 400,
            body: {
                error:
                    "Agent profile is not runnable: runtimeConfig.apiKeyEnvVar must be ANTHROPIC_API_KEY",
            },
        });
    });

    it("blocks hosted runs when operator opt-in is disabled", async () => {
        process.env["ALLOW_HOSTED_AGENT_EXECUTION"] = "false";

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

        expect(response).toEqual({
            statusCode: 403,
            body: {
                error:
                    "Hosted agent execution is disabled. Set ALLOW_HOSTED_AGENT_EXECUTION=true to allow provider API calls.",
            },
        });
    });
});
