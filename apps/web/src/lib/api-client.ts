import type { AgentExecutionMode, AgentProvider } from "@repobench/domain";

// API_INTERNAL_URL is a runtime env var set in Docker Compose for server-to-server
// communication (container name resolution). Falls back to the NEXT_PUBLIC var
// (baked at build time) which works for local dev and browser-side fetches.
const API_BASE =
  process.env["API_INTERNAL_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
const API_TOKEN = process.env["REPOBENCH_API_TOKEN"] ?? process.env["API_AUTH_TOKEN"] ?? "";

type JsonObject = Readonly<Record<string, unknown>>;

export type AgentProfileResponse = {
  readonly id: string;
  readonly name: string;
  readonly provider: AgentProvider;
  readonly model: string;
  readonly executionMode: AgentExecutionMode;
  readonly createdAt: string;
};

export type CreateAgentProfileInput = {
  readonly name: string;
  readonly provider: AgentProvider;
  readonly model: string;
  readonly executionMode: AgentExecutionMode;
  readonly runtimeConfig: JsonObject;
  readonly config?: JsonObject;
};

export type RepoResponse = {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly createdAt: string;
};

export type CreateRepoInput = {
  readonly owner: string;
  readonly name: string;
};

export type SuiteResponse = {
  readonly id: string;
  readonly repositoryId: string;
  readonly name: string;
  readonly description: string;
  readonly taskCount: number;
  readonly createdAt: string;
};

export type CreateSuiteInput = {
  readonly name: string;
  readonly description?: string;
  readonly maxPrs?: number;
  readonly testCommand: string;
};

export type RunResponse = {
  readonly id: string;
  readonly suiteId: string;
  readonly agentProfileId: string;
  readonly status: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly passedTasks: number;
  readonly failedTasks: number;
  readonly createdAt: string;
};

export type CreateRunInput = {
  readonly agentProfileId: string;
};

export type RunMetricsResponse = {
  readonly status: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly passedTasks: number;
  readonly failedTasks: number;
  readonly completionRate: number;
  readonly passRate: number;
};

export type RunComparisonResponse = {
  readonly runA: RunMetricsResponse;
  readonly runB: RunMetricsResponse;
};

/**
 * Typed fetch wrapper for the RepoBench API.
 * Sends Authorization header when a server-side API token is configured.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (API_TOKEN.length > 0) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error: status=${response.status} path=${path} body=${body}`);
  }

  return response.json() as T;
}

export const apiClient = {
  agentProfiles: {
    list: (): Promise<{ agentProfiles: ReadonlyArray<AgentProfileResponse> }> =>
      apiFetch("/api/agent-profiles"),
    get: (id: string): Promise<{ agentProfile: AgentProfileResponse }> =>
      apiFetch(`/api/agent-profiles/${encodeURIComponent(id)}`),
    create: (input: CreateAgentProfileInput): Promise<{ agentProfile: AgentProfileResponse }> =>
      apiFetch("/api/agent-profiles", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  repos: {
    list: (): Promise<{ repos: ReadonlyArray<RepoResponse> }> => apiFetch("/api/repos"),
    get: (id: string): Promise<{ repo: RepoResponse }> =>
      apiFetch(`/api/repos/${encodeURIComponent(id)}`),
    create: (input: CreateRepoInput): Promise<{ repo: RepoResponse }> =>
      apiFetch("/api/repos", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  suites: {
    listByRepo: (repoId: string): Promise<{ suites: ReadonlyArray<SuiteResponse> }> =>
      apiFetch(`/api/repos/${encodeURIComponent(repoId)}/suites`),
    create: (repoId: string, input: CreateSuiteInput): Promise<{ suite: SuiteResponse }> =>
      apiFetch(`/api/repos/${encodeURIComponent(repoId)}/suites`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  runs: {
    list: (suiteId: string): Promise<{ runs: ReadonlyArray<RunResponse> }> =>
      apiFetch(`/api/suites/${encodeURIComponent(suiteId)}/runs`),
    create: (suiteId: string, input: CreateRunInput): Promise<{ run: RunResponse }> =>
      apiFetch(`/api/suites/${encodeURIComponent(suiteId)}/runs`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    get: (id: string): Promise<{ run: RunResponse }> =>
      apiFetch(`/api/runs/${encodeURIComponent(id)}`),
    results: (
      id: string,
    ): Promise<{
      run: RunResponse;
      summary: RunMetricsResponse & { readonly completedTasks: number };
      attempts: ReadonlyArray<unknown>;
      verdicts: ReadonlyArray<unknown>;
    }> => apiFetch(`/api/runs/${encodeURIComponent(id)}/results`),
    report: (id: string): Promise<{ report: unknown }> =>
      apiFetch(`/api/runs/${encodeURIComponent(id)}/report`),
    artifact: async (
      runId: string,
      attemptId: string,
      artifactKind: "patch" | "stdout" | "stderr",
    ): Promise<string> => {
      const response = await fetch(
        `${API_BASE}/api/runs/${encodeURIComponent(runId)}/attempts/${encodeURIComponent(attemptId)}/artifacts/${artifactKind}`,
        {
          headers: API_TOKEN.length > 0 ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `API error: status=${response.status} path=/api/runs/${runId}/attempts/${attemptId}/artifacts/${artifactKind} body=${body}`,
        );
      }

      return response.text();
    },
  },
  compare: {
    runs: (runA: string, runB: string): Promise<{ comparison: RunComparisonResponse }> =>
      apiFetch(`/api/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}`),
  },
};
