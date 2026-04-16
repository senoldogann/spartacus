import type React from "react";

export default function RunsPage(): React.JSX.Element {
    return (
        <main className="p-8">
            <h1 className="text-2xl font-bold">Benchmark Runs</h1>
            <p className="mt-2 text-gray-600">
                View and manage benchmark runs across your repositories.
            </p>
            {/* TODO: Run list with status badges and filters */}
        </main>
    );
}
