import Link from "next/link";
import type React from "react";

export default function HomePage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-12 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.25fr,0.95fr] lg:items-center">
        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-lg shadow-slate-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
            RepoBench
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-950">
            Benchmark coding agents on your own repository history.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Build suites from merged pull requests, run Claude, Codex, or local models against the
            same tasks, and compare outcomes with stored artifacts and deterministic scoring.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/setup"
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open setup
            </Link>
            <Link
              href="/repos"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Browse repositories
            </Link>
          </div>
        </section>

        <section className="grid gap-4">
          <Link
            href="/setup"
            className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Start here
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-emerald-950">Setup flow</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-900">
              Create agent profiles, connect a repository, build a suite, and launch your first run
              from the browser.
            </p>
          </Link>
          <Link
            href="/runs"
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Observe
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Runs and artifacts</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Inspect queued, running, and completed benchmarks with run-level detail and artifact
              downloads.
            </p>
          </Link>
          <Link
            href="/compare"
            className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Decide
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Compare outcomes</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use matched runs from the same suite to make side-by-side agent decisions with real
              task data.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
