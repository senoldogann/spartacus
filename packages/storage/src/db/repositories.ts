import type {
    AgentProfile,
    BenchmarkSuite,
    EvaluationVerdict,
    Repository,
    Run,
    RunAttempt,
    Task,
} from "@repobench/domain";

export type PaginationParams = {
    readonly limit: number;
    readonly offset: number;
};

/**
 * Data access interface for RepoBench entities.
 * Implementations should use parameterized queries to prevent SQL injection.
 */
export type RepositoryStore = {
    readonly findById: (id: string) => Promise<Repository | null>;
    readonly findByFullName: (fullName: string) => Promise<Repository | null>;
    readonly create: (repo: Repository) => Promise<Repository>;
    readonly listAll: (pagination?: PaginationParams) => Promise<ReadonlyArray<Repository>>;
};

export type SuiteStore = {
    readonly findById: (id: string) => Promise<BenchmarkSuite | null>;
    readonly findByRepository: (repositoryId: string, pagination?: PaginationParams) => Promise<ReadonlyArray<BenchmarkSuite>>;
    readonly create: (suite: BenchmarkSuite) => Promise<BenchmarkSuite>;
    readonly deleteById: (id: string) => Promise<void>;
};

export type TaskStore = {
    readonly findById: (id: string) => Promise<Task | null>;
    readonly findBySuite: (suiteId: string) => Promise<ReadonlyArray<Task>>;
    readonly create: (task: Task) => Promise<Task>;
    readonly createMany: (tasks: ReadonlyArray<Task>) => Promise<number>;
};

export type RunStore = {
    readonly findById: (id: string) => Promise<Run | null>;
    readonly findBySuite: (suiteId: string, pagination?: PaginationParams) => Promise<ReadonlyArray<Run>>;
    readonly create: (run: Run) => Promise<Run>;
    readonly updateStatus: (
        id: string,
        status: Run["status"],
        counts: {
            completedTasks: number;
            passedTasks: number;
            failedTasks: number;
        },
    ) => Promise<void>;
};

export type RunAttemptStore = {
    readonly findByRun: (runId: string) => Promise<ReadonlyArray<RunAttempt>>;
    readonly create: (attempt: RunAttempt) => Promise<RunAttempt>;
    readonly update: (
        id: string,
        input: {
            status: RunAttempt["status"];
            completedAt: Date | null;
            patchArtifactPath: string | null;
            stdoutLogPath: string | null;
            stderrLogPath: string | null;
            tokenCount: number | null;
            estimatedCostUsd: number | null;
            durationMs: number | null;
            errorMessage: string | null;
        },
    ) => Promise<void>;
};

export type EvaluationVerdictStore = {
    readonly findByRun: (runId: string) => Promise<ReadonlyArray<EvaluationVerdict>>;
    readonly create: (verdict: EvaluationVerdict) => Promise<EvaluationVerdict>;
};

export type AgentProfileStore = {
    readonly findById: (id: string) => Promise<AgentProfile | null>;
    readonly findByProvider: (
        provider: AgentProfile["provider"],
    ) => Promise<ReadonlyArray<AgentProfile>>;
    readonly create: (profile: AgentProfile) => Promise<AgentProfile>;
    readonly listAll: (pagination?: PaginationParams) => Promise<ReadonlyArray<AgentProfile>>;
};
