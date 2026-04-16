import type { RunStatus } from "@repobench/domain";
import type React from "react";

export type RunStatusBadgeProps = {
  readonly status: RunStatus;
};

const STATUS_STYLES: Record<RunStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-gray-100 text-gray-700" },
  running: { label: "Running", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-yellow-100 text-yellow-700" },
};

export function RunStatusBadge({ status }: RunStatusBadgeProps): React.JSX.Element {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}
