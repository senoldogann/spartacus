import type React from "react";
import { apiClient } from "../../lib/api-client";

// Prevent Next.js from statically pre-rendering this page at build time.
// The page must fetch live data from the API on every request.
export const dynamic = "force-dynamic";

type Repo = {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly createdAt: string;
};

export default async function ReposPage(): Promise<React.JSX.Element> {
  let repos: ReadonlyArray<Repo> = [];
  let error: string | null = null;

  try {
    const data = await apiClient.repos.list();
    repos = data.repos as ReadonlyArray<Repo>;
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Failed to load repositories";
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Repositories</h1>
      <p className="mt-2 text-gray-600">Connect a repository to start benchmarking agents.</p>

      {error !== null && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      {error === null && repos.length === 0 && (
        <p className="mt-6 text-gray-500">No repositories connected yet.</p>
      )}

      {repos.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <div key={repo.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                {repo.owner}/{repo.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Created {new Date(repo.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
