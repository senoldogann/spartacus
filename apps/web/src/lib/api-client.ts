const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

/**
 * Typed fetch wrapper for the RepoBench API.
 */
async function apiFetch<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `API error: status=${response.status} path=${path} body=${body}`,
        );
    }

    return response.json() as Promise<T>;
}

export const apiClient = {
    repos: {
        list: (): Promise<{ repos: ReadonlyArray<unknown> }> =>
            apiFetch("/api/repos"),
        get: (id: string): Promise<{ repo: unknown }> =>
            apiFetch(`/api/repos/${encodeURIComponent(id)}`),
    },
    runs: {
        list: (suiteId: string): Promise<{ runs: ReadonlyArray<unknown> }> =>
            apiFetch(`/api/suites/${encodeURIComponent(suiteId)}/runs`),
        get: (id: string): Promise<{ run: unknown }> =>
            apiFetch(`/api/runs/${encodeURIComponent(id)}`),
        results: (id: string): Promise<{ results: ReadonlyArray<unknown> }> =>
            apiFetch(`/api/runs/${encodeURIComponent(id)}/results`),
    },
    compare: {
        runs: (
            runA: string,
            runB: string,
        ): Promise<{ comparison: unknown }> =>
            apiFetch(
                `/api/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}`,
            ),
    },
};
