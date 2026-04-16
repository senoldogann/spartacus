/**
 * Minimal GitHub PR list API response shape.
 */
type GitHubPullRequestListItem = {
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly html_url: string;
  readonly base: { readonly sha: string };
  readonly merge_commit_sha: string | null;
  readonly labels: ReadonlyArray<{ readonly name: string }>;
};

type GitHubPullRequestDetail = GitHubPullRequestListItem & {
  readonly changed_files: number;
};

const GITHUB_API_TIMEOUT_MS = 30_000;

function createGitHubHeaders(token: string): Readonly<Record<string, string>> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function isPullRequestListItemArray(
  value: unknown,
): value is ReadonlyArray<GitHubPullRequestListItem> {
  return Array.isArray(value);
}

function isPullRequestDetail(value: unknown): value is GitHubPullRequestDetail {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "number" in value &&
    "merge_commit_sha" in value &&
    "changed_files" in value &&
    "labels" in value
  );
}

async function fetchPullRequestDetail(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
): Promise<GitHubPullRequestDetail> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;

  const response = await fetch(url, {
    headers: createGitHubHeaders(token),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error: status=${response.status} url=${url} body=${body}`);
  }

  const detail = await response.json();

  if (!isPullRequestDetail(detail)) {
    throw new Error(`GitHub API returned an unexpected PR detail shape: url=${url}`);
  }

  return detail;
}

async function fetchInBatches<T, R>(
  items: ReadonlyArray<T>,
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<ReadonlyArray<R>> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * A candidate PR extracted from GitHub, before filtering.
 */
export type PrCandidate = {
  readonly prNumber: number;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly baseSha: string;
  readonly headSha: string;
  readonly changedFiles: number;
  readonly labels: ReadonlyArray<string>;
};

/**
 * Fetches merged pull requests from a GitHub repository.
 * Paginates through results, returning up to maxResults.
 */
export async function fetchMergedPrs(
  owner: string,
  repo: string,
  token: string,
  maxResults: number,
): Promise<ReadonlyArray<PrCandidate>> {
  if (!Number.isInteger(maxResults) || maxResults <= 0) {
    throw new Error("maxResults must be a positive integer");
  }

  const results: PrCandidate[] = [];
  let page = 1;
  const perPage = 100;

  while (results.length < maxResults) {
    const url =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls` +
      `?state=closed&sort=updated&direction=desc&per_page=${perPage}&page=${page}`;

    const response = await fetch(url, {
      headers: createGitHubHeaders(token),
      signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error: status=${response.status} url=${url} body=${body}`);
    }

    const payload = await response.json();

    if (!isPullRequestListItemArray(payload)) {
      throw new Error(`GitHub API returned an unexpected PR list shape: url=${url}`);
    }

    const prs = payload;

    if (prs.length === 0) {
      break;
    }

    const remainingSlots = maxResults - results.length;
    const mergedPrs = prs.filter((pr) => pr.merge_commit_sha !== null).slice(0, remainingSlots);

    const detailedPrs = await fetchInBatches(mergedPrs, 5, (pr) =>
      fetchPullRequestDetail(owner, repo, pr.number, token),
    );

    for (const pr of detailedPrs) {
      if (pr.merge_commit_sha === null) {
        continue;
      }

      results.push({
        prNumber: pr.number,
        title: pr.title,
        description: pr.body ?? "",
        url: pr.html_url,
        baseSha: pr.base.sha,
        headSha: pr.merge_commit_sha,
        changedFiles: pr.changed_files,
        labels: pr.labels.map((l) => l.name),
      });

      if (results.length >= maxResults) {
        break;
      }
    }

    page += 1;
  }

  return results;
}
