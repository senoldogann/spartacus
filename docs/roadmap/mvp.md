# MVP Roadmap

## Definition

The MVP is the minimum viable version that proves RepoBench's core value proposition: a team can benchmark coding agents on their own repository and get reproducible, comparable results.

## MVP Features

### Must Have
- [ ] GitHub repository connection (PAT-based)
- [ ] Merged PR import with bugfix filtering
- [ ] Task snapshot creation (base commit + diff + test command)
- [ ] Docker-based sandbox execution
- [ ] Claude agent adapter
- [ ] Codex agent adapter
- [ ] Deterministic evaluator (patch apply + build + test)
- [ ] CLI: init, import, run, report, compare
- [ ] REST API for all operations
- [ ] Postgres storage for metadata
- [ ] S3-compatible artifact storage
- [ ] BullMQ worker for background execution

### Should Have
- [ ] Web dashboard (read-only results viewer)
- [ ] Run comparison view
- [ ] Basic metric aggregation (pass rate, avg cost, avg duration)

### Won't Have (v1)
- GitLab/Jira integration
- GitHub App / webhook automation
- LLM-as-judge evaluation
- Firecracker sandboxing
- Multi-tenant authentication
- Feature generation benchmarking
