import type { Repository } from "@repobench/domain";

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

/**
 * Fetches repository metadata from the GitHub API.
 */
export async function fetchRepository(
    owner: string,
    name: string,
    token: string,
): Promise<Repository> {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `GitHub API error: status=${response.status} url=${url} body=${body}`,
        );
    }

    const data = (await response.json()) as GitHubRepoResponse;

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
