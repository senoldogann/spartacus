const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
const API_TOKEN = process.env["REPOBENCH_API_TOKEN"] ?? process.env["API_AUTH_TOKEN"] ?? "";

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
    list: (): Promise<{ agentProfiles: ReadonlyArray<unknown> }> => apiFetch("/api/agent-profiles"),
    get: (id: string): Promise<{ agentProfile: unknown }> =>
      apiFetch(`/api/agent-profiles/${encodeURIComponent(id)}`),
    create: (input: {
      readonly name: string;
      readonly provider: string;
      readonly model: string;
      readonly executionMode?: "hosted" | "local";
      readonly runtimeConfig?: Record<string, unknown>;
      readonly config?: Record<string, unknown>;
    }): Promise<{ agentProfile: unknown }> =>
      apiFetch("/api/agent-profiles", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  repos: {
    list: (): Promise<{ repos: ReadonlyArray<unknown> }> => apiFetch("/api/repos"),
    get: (id: string): Promise<{ repo: unknown }> =>
      apiFetch(`/api/repos/${encodeURIComponent(id)}`),
  },
  runs: {
    list: (suiteId: string): Promise<{ runs: ReadonlyArray<unknown> }> =>
      apiFetch(`/api/suites/${encodeURIComponent(suiteId)}/runs`),
    get: (id: string): Promise<{ run: unknown }> => apiFetch(`/api/runs/${encodeURIComponent(id)}`),
    results: (
      id: string,
    ): Promise<{
      run: unknown;
      summary: unknown;
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
    runs: (runA: string, runB: string): Promise<{ comparison: unknown }> =>
      apiFetch(`/api/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}`),
  },
};
