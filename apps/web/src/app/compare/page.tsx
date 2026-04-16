import type React from "react";

export default function ComparePage(): React.JSX.Element {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Compare Agents</h1>
      <p className="mt-2 text-gray-600">
        Select two benchmark runs to compare agent performance side-by-side.
      </p>
      {/* TODO: Run selector + comparison table + metric charts */}
    </main>
  );
}
