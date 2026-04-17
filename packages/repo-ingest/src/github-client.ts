import type { Repository } from "@repobench/domain";
import { fetchGitHubJson } from "./github-request.js";

/**
 * Minimal GitHub API response shape for a repository.
 */
type GitHubRepoResponse = {
  readonly id: number;
  readonly full_name: string;
  readonly owner: { readonly login: string };
  readonly name: string;
  readonly clone_url: string;
  readonly default_branch: string;
  readonly language: string | null;
};

function isGitHubRepoResponse(value: unknown): value is GitHubRepoResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "full_name" in value &&
    "owner" in value &&
    "name" in value &&
    "clone_url" in value &&
    "default_branch" in value
  );
}

/**
 * Fetches repository metadata from the GitHub API.
 */
export async function fetchRepository(
  owner: string,
  name: string,
  token: string,
): Promise<Repository> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const data = await fetchGitHubJson(
    {
      url,
      token,
      accept: "application/vnd.github+json",
      context: `fetchRepository owner=${owner} repo=${name}`,
    },
    isGitHubRepoResponse,
    "repository",
  );

  return {
    id: String(data.id),
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    source: "github",
    cloneUrl: data.clone_url,
    defaultBranch: data.default_branch,
    language: data.language,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
