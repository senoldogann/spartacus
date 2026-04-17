import type React from "react";

export default function HomePage(): React.JSX.Element {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold">RepoBench</h1>
            <p className="mt-4 text-lg text-gray-600">
                Benchmark coding agents on your own repository history.
            </p>
            <div className="mt-8 flex gap-4">
                <a href="/repos" className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
                    Repositories
                </a>
                <a href="/runs" className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50">
                    Runs
                </a>
                <a href="/compare" className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50">
                    Compare
                </a>
            </div>
        </main>
    );
}
