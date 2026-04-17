import Link from "next/link";
import type React from "react";
import { apiClient } from "../../lib/api-client";

export const dynamic = "force-dynamic";

type Run = {
  readonly id: string;
  readonly status: string;
  readonly totalTasks: number;
  readonly passedTasks: number;
  readonly failedTasks: number;
  readonly createdAt: string;
};

type RunsPageProps = {
  searchParams: Promise<{ suiteId?: string }>;
};

function statusBadge(status: string): React.JSX.Element {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    running: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default async function RunsPage({
  searchParams,
}: RunsPageProps): Promise<React.JSX.Element> {
  const { suiteId } = await searchParams;

  if (suiteId === undefined || suiteId.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Benchmark Runs</h1>
        <p className="mt-4 text-gray-600">Select a repository and suite to view benchmark runs.</p>
      </main>
    );
  }

  let runs: ReadonlyArray<Run> = [];
  let error: string | null = null;

  try {
    const data = await apiClient.runs.list(suiteId);
    runs = data.runs as ReadonlyArray<Run>;
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Failed to load runs";
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Benchmark Runs</h1>
      <p className="mt-2 text-gray-600">Suite: {suiteId}</p>

      {error !== null && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      {error === null && runs.length === 0 && (
        <p className="mt-6 text-gray-500">No runs found for this suite.</p>
      )}

      {runs.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Passed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Failed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Link href={`/runs/${run.id}`} className="text-blue-600 hover:underline">
                      {run.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{statusBadge(run.status)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{run.totalTasks}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{run.passedTasks}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{run.failedTasks}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
