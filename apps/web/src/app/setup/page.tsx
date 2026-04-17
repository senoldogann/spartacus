import Link from "next/link";
import type React from "react";
import {
  apiClient,
  type AgentProfileResponse,
  type RepoResponse,
  type SuiteResponse,
} from "../../lib/api-client";
import {
  createAgentProfileAction,
  createRepositoryAction,
  createRunAction,
  createSuiteAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SetupPageProps = {
  searchParams: Promise<{ notice?: string; message?: string; id?: string }>;
};

type SetupSuite = SuiteResponse & {
  readonly repoName: string;
};

type SetupData = {
  readonly repos: ReadonlyArray<RepoResponse>;
  readonly agentProfiles: ReadonlyArray<AgentProfileResponse>;
  readonly suites: ReadonlyArray<SetupSuite>;
  readonly error: string | null;
};

function getCardClassName(): string {
  return "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5";
}

function getFieldClassName(): string {
  return "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white";
}

async function loadSetupData(): Promise<SetupData> {
  try {
    const [repoData, agentProfileData] = await Promise.all([
      apiClient.repos.list(),
      apiClient.agentProfiles.list(),
    ]);

    const suiteGroups = await Promise.all(
      repoData.repos.map(async (repo) => {
        const response = await apiClient.suites.listByRepo(repo.id);
        return response.suites.map((suite) => ({
          ...suite,
          repoName: `${repo.owner}/${repo.name}`,
        }));
      }),
    );

    return {
      repos: repoData.repos,
      agentProfiles: agentProfileData.agentProfiles,
      suites: suiteGroups.flat(),
      error: null,
    };
  } catch (error: unknown) {
    return {
      repos: [],
      agentProfiles: [],
      suites: [],
      error: error instanceof Error ? error.message : "Failed to load setup data",
    };
  }
}

function renderNotice(
  notice: string | undefined,
  message: string | undefined,
  id: string | undefined,
): React.JSX.Element | null {
  if (notice === undefined) {
    return null;
  }

  if (notice === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {message ?? "Setup action failed"}
      </div>
    );
  }

  const contentMap: Record<string, React.JSX.Element> = {
    "agent-created": (
      <span>
        Agent profile created successfully{typeof id === "string" ? ` (${id.slice(0, 8)}…)` : ""}.
      </span>
    ),
    "repo-created": (
      <span>
        Repository connected. Continue by creating a benchmark suite from merged pull requests.
      </span>
    ),
    "suite-created": (
      <span>
        Suite created successfully.{" "}
        {typeof id === "string" ? (
          <Link
            className="font-semibold underline"
            href={`/runs?suiteId=${encodeURIComponent(id)}`}
          >
            Open its runs page
          </Link>
        ) : null}
      </span>
    ),
  };

  const content = contentMap[notice];
  if (content === undefined) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      {content}
    </div>
  );
}

export default async function SetupPage({
  searchParams,
}: SetupPageProps): Promise<React.JSX.Element> {
  const { notice, message, id } = await searchParams;
  const data = await loadSetupData();
  const hasRepos = data.repos.length > 0;
  const hasSuites = data.suites.length > 0;
  const hasAgentProfiles = data.agentProfiles.length > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-lg shadow-slate-950/5 lg:grid-cols-[1.4fr,0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Browser Setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Create agents, repos, suites, and runs without leaving the dashboard.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This page wires the same API flow used by the CLI into a browser-first setup sequence.
              You still need valid environment variables in the running stack, especially
              GITHUB_TOKEN and the provider credentials for whichever agent you want to benchmark.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-slate-100">
            <h2 className="text-lg font-semibold">Prerequisites</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>GITHUB_TOKEN is required to connect repositories and generate suites.</li>
              <li>
                ALLOW_HOSTED_AGENT_EXECUTION=true is required for hosted Claude or Codex runs.
              </li>
              <li>
                ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPEN_SOURCE_API_KEY must match the agent
                profile you choose.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link
                href="/repos"
                className="rounded-full bg-emerald-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-300"
              >
                View repositories
              </Link>
              <Link
                href="/runs"
                className="rounded-full border border-slate-700 px-4 py-2 font-medium text-white transition hover:border-slate-500 hover:bg-slate-900"
              >
                Browse runs
              </Link>
            </div>
          </div>
        </section>

        {renderNotice(notice, message, id)}

        {data.error !== null && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {data.error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
          <div className="grid gap-6">
            <section className={getCardClassName()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Step 1
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Create an agent profile
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Hosted providers use their API transport. Open-source profiles default to an
                    OpenAI-compatible local endpoint such as Ollama.
                  </p>
                </div>
              </div>

              <form action={createAgentProfileAction} className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Agent name
                  <input
                    className={getFieldClassName()}
                    name="name"
                    placeholder="Claude Sonnet"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Provider
                  <select className={getFieldClassName()} defaultValue="claude" name="provider">
                    <option value="claude">Claude</option>
                    <option value="codex">Codex</option>
                    <option value="open-source">Open-source</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Model
                  <input
                    className={getFieldClassName()}
                    name="model"
                    placeholder="claude-sonnet-4-5"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Execution mode
                  <select
                    className={getFieldClassName()}
                    defaultValue="hosted"
                    name="executionMode"
                  >
                    <option value="hosted">Hosted</option>
                    <option value="local">Local</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Base URL (open-source local only)
                  <input
                    className={getFieldClassName()}
                    name="baseUrl"
                    placeholder="http://127.0.0.1:11434/v1"
                  />
                </label>
                <div className="md:col-span-2">
                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Save agent profile
                  </button>
                </div>
              </form>
            </section>

            <section className={getCardClassName()}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Step 2
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Connect a repository</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                RepoBench pulls repository metadata from GitHub, then uses merged pull requests to
                build benchmark tasks.
              </p>

              <form action={createRepositoryAction} className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Repository owner
                  <input
                    className={getFieldClassName()}
                    name="owner"
                    placeholder="senoldogann"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Repository name
                  <input
                    className={getFieldClassName()}
                    name="name"
                    placeholder="spartacus"
                    required
                  />
                </label>
                <div className="md:col-span-2">
                  <button className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                    Connect repository
                  </button>
                </div>
              </form>
            </section>

            <section className={getCardClassName()}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Step 3
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Generate a benchmark suite
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Suite creation inspects merged pull requests and snapshots each candidate task. This
                may take longer than the other setup steps.
              </p>

              <form action={createSuiteAction} className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Repository
                  <select
                    className={getFieldClassName()}
                    disabled={!hasRepos}
                    name="repoId"
                    required
                  >
                    <option value="">Select a repository</option>
                    {data.repos.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.owner}/{repo.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Suite name
                  <input
                    className={getFieldClassName()}
                    name="name"
                    placeholder="default"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Max merged PRs
                  <input
                    className={getFieldClassName()}
                    max={200}
                    min={1}
                    name="maxPrs"
                    placeholder="50"
                    type="number"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Test command
                  <input
                    className={getFieldClassName()}
                    name="testCommand"
                    placeholder="pnpm test"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Description (optional)
                  <input
                    className={getFieldClassName()}
                    name="description"
                    placeholder="Bugfix benchmark for core flows"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!hasRepos}
                  >
                    Create suite
                  </button>
                </div>
              </form>
            </section>

            <section className={getCardClassName()}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Step 4
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Start a benchmark run</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Starting a run queues work for the background worker. You will be redirected to the
                run detail page as soon as the run is created.
              </p>

              <form action={createRunAction} className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Suite
                  <select
                    className={getFieldClassName()}
                    disabled={!hasSuites}
                    name="suiteId"
                    required
                  >
                    <option value="">Select a suite</option>
                    {data.suites.map((suite) => (
                      <option key={suite.id} value={suite.id}>
                        {suite.repoName} · {suite.name} ({suite.taskCount} tasks)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Agent profile
                  <select
                    className={getFieldClassName()}
                    disabled={!hasAgentProfiles}
                    name="agentProfileId"
                    required
                  >
                    <option value="">Select an agent profile</option>
                    {data.agentProfiles.map((agentProfile) => (
                      <option key={agentProfile.id} value={agentProfile.id}>
                        {agentProfile.name} · {agentProfile.provider} / {agentProfile.model}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2">
                  <button
                    className="rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!hasSuites || !hasAgentProfiles}
                  >
                    Start run
                  </button>
                </div>
              </form>
            </section>
          </div>

          <aside className="grid gap-6 content-start">
            <section className={getCardClassName()}>
              <h2 className="text-xl font-semibold text-slate-950">Current workspace state</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                As you create resources, they appear here with direct links into the rest of the
                dashboard.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Agent profiles
                  </h3>
                  {hasAgentProfiles ? (
                    <ul className="mt-3 space-y-3">
                      {data.agentProfiles.map((agentProfile) => (
                        <li
                          key={agentProfile.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <p className="font-medium text-slate-900">{agentProfile.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {agentProfile.provider} · {agentProfile.model} ·{" "}
                            {agentProfile.executionMode}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No agent profiles yet.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Repositories
                  </h3>
                  {hasRepos ? (
                    <ul className="mt-3 space-y-3">
                      {data.repos.map((repo) => {
                        const repoSuites = data.suites.filter(
                          (suite) => suite.repositoryId === repo.id,
                        );
                        return (
                          <li
                            key={repo.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {repo.owner}/{repo.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {repoSuites.length} suite{repoSuites.length === 1 ? "" : "s"}
                                </p>
                              </div>
                              <Link
                                className="text-sm font-medium text-blue-700 underline"
                                href="/repos"
                              >
                                Open
                              </Link>
                            </div>
                            {repoSuites.length > 0 ? (
                              <ul className="mt-3 space-y-2">
                                {repoSuites.map((suite) => (
                                  <li
                                    key={suite.id}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                                  >
                                    <div>
                                      <p className="font-medium text-slate-900">{suite.name}</p>
                                      <p className="text-slate-500">{suite.taskCount} tasks</p>
                                    </div>
                                    <Link
                                      className="font-medium text-blue-700 underline"
                                      href={`/runs?suiteId=${encodeURIComponent(suite.id)}`}
                                    >
                                      Runs
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No repositories connected yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="text-xl font-semibold text-emerald-950">Recommended flow</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-emerald-900">
                <li>1. Create one agent profile that matches the credential you configured.</li>
                <li>2. Connect a repository with enough merged pull requests to build a suite.</li>
                <li>3. Create a suite with the same test command you would run locally.</li>
                <li>4. Start a run, then inspect artifacts and compare multiple runs afterward.</li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
