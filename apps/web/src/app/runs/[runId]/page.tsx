import type React from "react";

type RunDetailPageProps = {
    params: Promise<{ runId: string }>;
};

export default async function RunDetailPage({
    params,
}: RunDetailPageProps): Promise<React.JSX.Element> {
    const { runId } = await params;

    return (
        <main className="p-8">
            <h1 className="text-2xl font-bold">Run: {runId}</h1>
            <p className="mt-2 text-gray-600">
                Detailed results and metrics for this benchmark run.
            </p>
            {/* TODO: Task-level results, metrics cards, artifact links */}
        </main>
    );
}
