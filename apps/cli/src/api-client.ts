// Typed fetch wrapper for the RepoBench API.

type FetchOptions = {
    readonly method?: string;
    readonly body?: unknown;
};

type RepoResponse = {
    readonly id: string;
    readonly fullName: string;
    readonly owner: string;
    readonly name: string;
};

type SuiteResponse = {
    readonly id: string;
    readonly repoId: string;
    readonly name: string;
    readonly taskCount: number;
};

type RunResponse = {
    readonly id: string;
    readonly suiteId: string;
    readonly agentProfileId: string;
    readonly status: string;
    readonly totalTasks: number;
    readonly completedTasks: number;
    readonly passedTasks: number;
    readonly failedTasks: number;
};

type RunReport = {
    readonly runId: string;
    readonly suiteId: string;
    readonly agentProfileId: string;
    readonly status: string;
    readonly totalTasks: number;
    readonly completedTasks: number;
    readonly passedTasks: number;
    readonly failedTasks: number;
    readonly completionRate: number;
    readonly passRate: number;
    readonly createdAt: string;
    readonly completedAt: string | null;
};

type RunSummary = {
    readonly id: string;
    readonly status: string;
    readonly totalTasks: number;
    readonly completedTasks: number;
    readonly passedTasks: number;
    readonly failedTasks: number;
    readonly completionRate: number;
    readonly passRate: number;
};

type ComparisonResponse = {
    readonly suiteId: string;
    readonly runA: RunSummary;
    readonly runB: RunSummary;
};

type AgentProfileResponse = {
    readonly id: string;
    readonly name: string;
    readonly provider: string;
    readonly model: string;
};

type CreateSuiteBody = {
    readonly name: string;
    readonly testCommand: string;
    readonly maxPrs?: number;
};

function getBaseUrl(): string {
    return process.env["REPOBENCH_API_URL"] ?? "http://localhost:3001";
}

function getAuthToken(): string | undefined {
    return process.env["REPOBENCH_API_TOKEN"] ?? process.env["API_AUTH_TOKEN"];
}

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
    const baseUrl = getBaseUrl();
    const token = getAuthToken();
    const method = options?.method ?? "GET";

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token !== undefined) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchInit: RequestInit = {
        method,
        headers,
    };

    if (options?.body !== undefined) {
        fetchInit.body = JSON.stringify(options.body);
    }

    const url = `${baseUrl}${path}`;
    const response = await fetch(url, fetchInit);

    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
            `API request failed: ${method} ${path} returned ${String(response.status)} — ${responseBody}`,
        );
    }

    const json = (await response.json()) as T;
    return json;
}

export const apiClient = {
    repos: {
        async list(): Promise<ReadonlyArray<RepoResponse>> {
            const data = await apiFetch<{ repos: ReadonlyArray<RepoResponse> }>("/api/repos");
            return data.repos;
        },

        async create(owner: string, name: string): Promise<RepoResponse> {
            const data = await apiFetch<{ repo: RepoResponse }>("/api/repos", {
                method: "POST",
                body: { owner, name },
            });
            return data.repo;
        },
    },

    suites: {
        async listByRepo(repoId: string): Promise<ReadonlyArray<SuiteResponse>> {
            const data = await apiFetch<{ suites: ReadonlyArray<SuiteResponse> }>(
                `/api/repos/${encodeURIComponent(repoId)}/suites`,
            );
            return data.suites;
        },

        async create(repoId: string, body: CreateSuiteBody): Promise<SuiteResponse> {
            const data = await apiFetch<{ suite: SuiteResponse }>(
                `/api/repos/${encodeURIComponent(repoId)}/suites`,
                {
                    method: "POST",
                    body,
                },
            );
            return data.suite;
        },
    },

    runs: {
        async create(suiteId: string, agentProfileId: string): Promise<RunResponse> {
            const data = await apiFetch<{ run: RunResponse }>(
                `/api/suites/${encodeURIComponent(suiteId)}/runs`,
                {
                    method: "POST",
                    body: { agentProfileId },
                },
            );
            return data.run;
        },

        async report(runId: string): Promise<RunReport> {
            const data = await apiFetch<{ report: RunReport }>(
                `/api/runs/${encodeURIComponent(runId)}/report`,
            );
            return data.report;
        },
    },

    compare: {
        async runs(runA: string, runB: string): Promise<ComparisonResponse> {
            const data = await apiFetch<{ comparison: ComparisonResponse }>(
                `/api/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}`,
            );
            return data.comparison;
        },
    },

    agentProfiles: {
        async list(): Promise<ReadonlyArray<AgentProfileResponse>> {
            const data = await apiFetch<{ profiles: ReadonlyArray<AgentProfileResponse> }>(
                "/api/agent-profiles",
            );
            return data.profiles;
        },
    },
};
