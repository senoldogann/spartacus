import type React from "react";
import { apiClient } from "../../../lib/api-client";

type RunSummary = {
  readonly status: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly passedTasks: number;
  readonly failedTasks: number;
  readonly completionRate: number;
  readonly passRate: number;
};

type Attempt = {
  readonly attemptId: string;
  readonly taskId: string;
  readonly status: string;
  readonly attemptNumber: number;
};

type RunDetailPageProps = {
  params: Promise<{ runId: string }>;
};

function statusBadge(status: string): React.JSX.Element {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    passed: "bg-green-100 text-green-800",
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

function metricCard(label: string, value: string | number): React.JSX.Element {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default async function RunDetailPage({
  params,
}: RunDetailPageProps): Promise<React.JSX.Element> {
  const { runId } = await params;

  let summary: RunSummary | null = null;
  let attempts: ReadonlyArray<Attempt> = [];
  let error: string | null = null;

  try {
    const data = await apiClient.runs.results(runId);
    summary = data.summary as RunSummary;
    attempts = data.attempts as ReadonlyArray<Attempt>;
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Failed to load run results";
  }

  if (error !== null) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Run: {runId.slice(0, 8)}…</h1>
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Run: {runId.slice(0, 8)}…</h1>

      {summary !== null && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricCard("Status", summary.status)}
          {metricCard("Total Tasks", summary.totalTasks)}
          {metricCard("Completed", summary.completedTasks)}
          {metricCard("Passed", summary.passedTasks)}
          {metricCard("Failed", summary.failedTasks)}
          {metricCard("Completion Rate", `${(summary.completionRate * 100).toFixed(1)}%`)}
          {metricCard("Pass Rate", `${(summary.passRate * 100).toFixed(1)}%`)}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <h2 className="mb-3 text-lg font-semibold">Attempts</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Attempt ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Task ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  #
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {attempts.map((attempt) => (
                <tr key={attempt.attemptId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                    {attempt.attemptId.slice(0, 8)}…
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                    {attempt.taskId.slice(0, 8)}…
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {statusBadge(attempt.status)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{attempt.attemptNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {attempts.length === 0 && error === null && (
        <p className="mt-6 text-gray-500">No attempts recorded for this run.</p>
      )}
    </main>
  );
}
