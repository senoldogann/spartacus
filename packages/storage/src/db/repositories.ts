import type {
    Repository,
    BenchmarkSuite,
    Task,
    Run,
    AgentProfile,
} from "@repobench/domain";

/**
 * Data access interface for RepoBench entities.
 * Implementations should use parameterized queries to prevent SQL injection.
 */
export type RepositoryStore = {
    readonly findById: (id: string) => Promise<Repository | null>;
    readonly findByFullName: (fullName: string) => Promise<Repository | null>;
    readonly create: (repo: Repository) => Promise<Repository>;
    readonly listAll: () => Promise<ReadonlyArray<Repository>>;
};

export type SuiteStore = {
    readonly findById: (id: string) => Promise<BenchmarkSuite | null>;
    readonly findByRepository: (
        repositoryId: string,
    ) => Promise<ReadonlyArray<BenchmarkSuite>>;
    readonly create: (suite: BenchmarkSuite) => Promise<BenchmarkSuite>;
};

export type TaskStore = {
    readonly findById: (id: string) => Promise<Task | null>;
    readonly findBySuite: (suiteId: string) => Promise<ReadonlyArray<Task>>;
    readonly create: (task: Task) => Promise<Task>;
    readonly createMany: (tasks: ReadonlyArray<Task>) => Promise<number>;
};

export type RunStore = {
    readonly findById: (id: string) => Promise<Run | null>;
    readonly findBySuite: (suiteId: string) => Promise<ReadonlyArray<Run>>;
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

export type AgentProfileStore = {
    readonly findById: (id: string) => Promise<AgentProfile | null>;
    readonly findByProvider: (
        provider: AgentProfile["provider"],
    ) => Promise<ReadonlyArray<AgentProfile>>;
    readonly create: (profile: AgentProfile) => Promise<AgentProfile>;
    readonly listAll: () => Promise<ReadonlyArray<AgentProfile>>;
};
