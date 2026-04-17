const GITHUB_API_TIMEOUT_MS = 30_000;
const GITHUB_MAX_RETRIES = 3;
const GITHUB_BASE_BACKOFF_MS = 500;
const GITHUB_MAX_TOTAL_RETRY_MS = 60_000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

type GitHubRequestSpec = {
    readonly url: string;
    readonly token: string;
    readonly accept: string;
    readonly context: string;
};

function createGitHubHeaders(spec: GitHubRequestSpec): Readonly<Record<string, string>> {
    return {
        Authorization: `Bearer ${spec.token}`,
        Accept: spec.accept,
        "X-GitHub-Api-Version": "2022-11-28",
    };
}

function isRetryableError(error: unknown): boolean {
    return (
        error instanceof TypeError ||
        (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
    );
}

function resolveBackoffDelayMs(attemptNumber: number): number {
    return GITHUB_BASE_BACKOFF_MS * 2 ** (attemptNumber - 1);
}

function parseRetryDelayMs(response: Response): number | null {
    const retryAfter = response.headers.get("retry-after");

    if (retryAfter !== null) {
        const retryAfterSeconds = Number.parseInt(retryAfter, 10);
        if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
            return retryAfterSeconds * 1000;
        }

        const retryAfterDate = Date.parse(retryAfter);
        if (!Number.isNaN(retryAfterDate)) {
            return Math.max(0, retryAfterDate - Date.now());
        }
    }

    const rateLimitReset = response.headers.get("x-ratelimit-reset");
    if (rateLimitReset === null) {
        return null;
    }

    const resetSeconds = Number.parseInt(rateLimitReset, 10);
    if (Number.isNaN(resetSeconds)) {
        return null;
    }

    return Math.max(0, resetSeconds * 1000 - Date.now());
}

function isRetryableResponse(response: Response, body: string): boolean {
    if (RETRYABLE_STATUS_CODES.has(response.status)) {
        return true;
    }

    if (response.status !== 403) {
        return false;
    }

    const normalizedBody = body.toLowerCase();
    return (
        response.headers.has("retry-after") ||
        response.headers.has("x-ratelimit-reset") ||
        normalizedBody.includes("rate limit")
    );
}

async function waitForRetry(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function clampRetryDelayMs(delayMs: number, requestStartedAt: number): number | null {
    const elapsedMs = Date.now() - requestStartedAt;
    const remainingBudgetMs = GITHUB_MAX_TOTAL_RETRY_MS - elapsedMs;

    if (remainingBudgetMs <= 0) {
        return null;
    }

    return Math.min(delayMs, remainingBudgetMs);
}

async function fetchGitHubResponse(spec: GitHubRequestSpec): Promise<Response> {
    let lastError: Error | null = null;
    const requestStartedAt = Date.now();

    for (let attemptNumber = 1; attemptNumber <= GITHUB_MAX_RETRIES; attemptNumber += 1) {
        try {
            const response = await fetch(spec.url, {
                headers: createGitHubHeaders(spec),
                signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
            });

            if (response.ok) {
                return response;
            }

            const body = await response.text();
            const message =
                `GitHub API error: status=${response.status} url=${spec.url} ` +
                `context=${spec.context} body=${body}`;

            if (attemptNumber < GITHUB_MAX_RETRIES && isRetryableResponse(response, body)) {
                const retryDelayMs = clampRetryDelayMs(
                    parseRetryDelayMs(response) ?? resolveBackoffDelayMs(attemptNumber),
                    requestStartedAt,
                );

                if (retryDelayMs === null) {
                    throw new Error(`${message} retryBudgetExceeded=true`);
                }

                lastError = new Error(`${message} attempt=${attemptNumber} retryDelayMs=${retryDelayMs}`);
                await waitForRetry(retryDelayMs);
                continue;
            }

            throw new Error(message);
        } catch (error: unknown) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));

            if (attemptNumber < GITHUB_MAX_RETRIES && isRetryableError(normalizedError)) {
                const retryDelayMs = clampRetryDelayMs(
                    resolveBackoffDelayMs(attemptNumber),
                    requestStartedAt,
                );

                if (retryDelayMs === null) {
                    throw normalizedError;
                }

                lastError = new Error(
                    `GitHub request failed: url=${spec.url} context=${spec.context} ` +
                    `attempt=${attemptNumber} retryDelayMs=${retryDelayMs} error=${normalizedError.message}`,
                );
                await waitForRetry(retryDelayMs);
                continue;
            }

            throw normalizedError;
        }
    }

    throw lastError ?? new Error(`GitHub request failed: url=${spec.url} context=${spec.context}`);
}

/**
 * Fetches and validates JSON from the GitHub API with bounded retries.
 */
export async function fetchGitHubJson<T>(
    spec: GitHubRequestSpec,
    validate: (value: unknown) => value is T,
    shapeName: string,
): Promise<T> {
    const response = await fetchGitHubResponse(spec);
    const payload: unknown = await response.json();

    if (!validate(payload)) {
        throw new Error(
            `GitHub API returned unexpected ${shapeName} shape: url=${spec.url} context=${spec.context}`,
        );
    }

    return payload;
}

/**
 * Fetches text content from the GitHub API with bounded retries.
 */
export async function fetchGitHubText(spec: GitHubRequestSpec): Promise<string> {
    const response = await fetchGitHubResponse(spec);
    return response.text();
}
