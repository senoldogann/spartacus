import Link from "next/link";
import type React from "react";
import { apiClient, type RepoResponse } from "../../lib/api-client";

// Prevent Next.js from statically pre-rendering this page at build time.
// The page must fetch live data from the API on every request.
export const dynamic = "force-dynamic";

export default async function ReposPage(): Promise<React.JSX.Element> {
  let repos: ReadonlyArray<RepoResponse> = [];
  let error: string | null = null;

  try {
    const data = await apiClient.repos.list();
    repos = data.repos;
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Failed to load repositories";
  }

  return (
    <main className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="mt-2 text-gray-600">
            Connected repositories used to generate benchmark suites.
          </p>
        </div>
        <Link
          href="/setup"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Open setup
        </Link>
      </div>

      {error !== null && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      {error === null && repos.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          No repositories connected yet. Use the{" "}
          <Link className="font-medium text-blue-700 underline" href="/setup">
            setup page
          </Link>{" "}
          to connect your first repository.
        </div>
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
