import type React from "react";
import { apiClient } from "../../lib/api-client";

type RunMetrics = {
  readonly status: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly passedTasks: number;
  readonly failedTasks: number;
  readonly completionRate: number;
  readonly passRate: number;
};

type Comparison = {
  readonly runA: RunMetrics;
  readonly runB: RunMetrics;
};

type ComparePageProps = {
  searchParams: Promise<{ runA?: string; runB?: string }>;
};

function metricRow(
  label: string,
  valueA: string | number,
  valueB: string | number,
): React.JSX.Element {
  return (
    <tr className="hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-700">{label}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-center">{valueA}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-center">{valueB}</td>
    </tr>
  );
}

export default async function ComparePage({
  searchParams,
}: ComparePageProps): Promise<React.JSX.Element> {
  const { runA, runB } = await searchParams;

  if (runA === undefined || runB === undefined || runA.length === 0 || runB.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Compare Runs</h1>
        <p className="mt-4 text-gray-600">
          Provide{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">?runA=...&runB=...</code> query
          parameters to compare two runs.
        </p>
      </main>
    );
  }

  let comparison: Comparison | null = null;
  let error: string | null = null;

  try {
    const data = await apiClient.compare.runs(runA, runB);
    comparison = data.comparison as Comparison;
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Failed to load comparison";
  }

  if (error !== null) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Compare Runs</h1>
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      </main>
    );
  }

  if (comparison === null) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Compare Runs</h1>
        <p className="mt-4 text-gray-500">No comparison data available.</p>
      </main>
    );
  }

  const { runA: metricsA, runB: metricsB } = comparison;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Compare Runs</h1>
      <p className="mt-2 text-gray-600">
        Comparing <span className="font-mono text-sm">{runA.slice(0, 8)}…</span> vs{" "}
        <span className="font-mono text-sm">{runB.slice(0, 8)}…</span>
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Metric
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                Run A ({runA.slice(0, 8)}…)
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                Run B ({runB.slice(0, 8)}…)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {metricRow("Status", metricsA.status, metricsB.status)}
            {metricRow("Total Tasks", metricsA.totalTasks, metricsB.totalTasks)}
            {metricRow("Completed", metricsA.completedTasks, metricsB.completedTasks)}
            {metricRow("Passed", metricsA.passedTasks, metricsB.passedTasks)}
            {metricRow("Failed", metricsA.failedTasks, metricsB.failedTasks)}
            {metricRow(
              "Completion Rate",
              `${(metricsA.completionRate * 100).toFixed(1)}%`,
              `${(metricsB.completionRate * 100).toFixed(1)}%`,
            )}
            {metricRow(
              "Pass Rate",
              `${(metricsA.passRate * 100).toFixed(1)}%`,
              `${(metricsB.passRate * 100).toFixed(1)}%`,
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
