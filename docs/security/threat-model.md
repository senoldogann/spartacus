# Threat Model

## Assets

1. **Source code** — Repository content cloned for benchmarking
2. **API tokens** — GitHub PATs, agent API keys
3. **Benchmark results** — Competitive intelligence about agent capabilities
4. **Infrastructure credentials** — Database, Redis, S3 access

## Threat Categories

### T1: Sandbox Escape

**Risk**: Agent code execution breaks out of Docker container.
**Mitigations**:

- `--network none` by default
- Read-only workspace mount
- Memory and CPU limits
- Non-root user inside container
- No privileged mode
- Container removed after execution

### T2: Secret Exposure in Logs

**Risk**: Agent API keys or repo tokens appear in stdout/stderr logs.
**Mitigations**:

- Log scrubbing before storage (regex patterns for common token formats)
- Artifact retention limits (90 days default)
- No secrets passed via environment to sandbox containers

### T3: Data Exfiltration via Agent

**Risk**: Agent sends repository code to unauthorized endpoints.
**Mitigations**:

- Network isolation (no outbound by default)
- Hosted provider calls are gated behind explicit operator opt-in
- Fine-grained egress allowlisting is deferred until a host firewall or egress proxy exists

### T4: Repository Data at Rest

**Risk**: Cloned repository data persists on disk after benchmarks.
**Mitigations**:

- Ephemeral workspace directories deleted after each task
- No persistent clone storage
- Artifact store contains diffs, not full source

### T5: Supply Chain Attack on Agent Adapters

**Risk**: Malicious agent adapter exfiltrates data.
**Mitigations**:

- Local/open-source execution can stay on-box via a local OpenAI-compatible endpoint
- Hosted provider execution is explicit in agent profile config and treated as an off-box trust boundary
- Adapter code is reviewed and version-pinned
- No dynamic code loading from external sources

## Security Boundaries

```
[Host System] ← Docker socket → [Sandbox Container] ← Agent API → [External]
     │
     ├── Postgres (local network)
     ├── Redis (local network)
     └── S3 Store (local network)
```

The Docker socket is the primary trust boundary for patch application and verification. Hosted model calls are a separate trust boundary and remain off-box by design when enabled.
