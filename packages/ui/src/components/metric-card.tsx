import type React from "react";

export type MetricCardProps = {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
  readonly trend?: "up" | "down" | "neutral";
};

export function MetricCard({ label, value, unit, trend }: MetricCardProps): React.JSX.Element {
  const trendColor =
    trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${trendColor}`}>
        {value}
        {unit !== undefined && (
          <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>
        )}
      </p>
    </div>
  );
}
