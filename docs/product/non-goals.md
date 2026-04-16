# Non-Goals

Things RepoBench intentionally does NOT do:

1. **General LLM leaderboard** — We benchmark on your repos, not on public datasets for ranking purposes.

2. **Observability platform** — RepoBench is not APM or logging. Use Datadog, Grafana, etc. for runtime observability.

3. **Code review bot** — RepoBench does not run in CI to review PRs. It evaluates agents offline on historical data.

4. **Live pair-programming** — No real-time coding assistance. RepoBench is a batch evaluation tool.

5. **Feature generation benchmarking (v1)** — v1 focuses on bugfix PR replay. Feature-from-issue tasks are planned for v2.

6. **LLM-as-judge scoring (v1)** — All v1 metrics are deterministic (patch apply, build, test). LLM-based quality scoring is experimental and deferred.

7. **Multi-language in a single task** — Each task is scoped to a single repository. Cross-repo tasks are not supported.

8. **Agent training** — RepoBench evaluates agents, it does not fine-tune or train them.

9. **SaaS hosting** — RepoBench is self-hosted first. Managed cloud hosting is a future consideration, not a v1 goal.
