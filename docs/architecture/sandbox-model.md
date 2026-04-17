# Sandbox Model

## Design Principles

1. **Isolation**: Evaluation commands must not affect the host system
2. **Reproducibility**: Same task + same agent = same conditions
3. **Security**: No secret leakage, no network exfiltration
4. **Cleanup**: No persistent side effects after run completion

## Implementation (v1: Docker)

The current runtime executes patch application and verification commands in an ephemeral Docker container.
Hosted agent adapters still run on the worker host today; full in-container agent execution is a planned follow-up.

Verification flow:

```
docker run --rm \
  --name repobench-<uuid> \
  --memory 2048m \
  --cpus 2 \
  --network none \
  -v /tmp/repobench-ws-xxx:/workspace:ro \
  repobench/sandbox:latest \
  <verification-command>
```

### Configuration

| Parameter                      | Default                  | Description                                      |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| `SANDBOX_TIMEOUT_MS`           | 300000 (5 min)           | Maximum execution time                           |
| `SANDBOX_DOCKER_IMAGE`         | repobench/sandbox:latest | Base image                                       |
| `ALLOW_HOSTED_AGENT_EXECUTION` | false                    | Explicit operator opt-in for off-box model calls |
| Memory limit                   | 2048 MB                  | Container memory cap                             |
| CPU limit                      | 2 cores                  | Container CPU cap                                |

### Network Policy

- **Default**: `--network none` — no network access
- Current runtime support: `DENY_ALL` only for Docker verification steps
- Hosted provider egress allowlisting remains deferred until host firewalling or an egress proxy is available

### Workspace Mounting

- Source snapshot is copied to a temp directory
- The verification workspace is mounted into the container at `/workspace`
- Verification output is captured from stdout/stderr
- Agent patch generation currently happens before the Docker verification step

### Cleanup

- Container is removed (`--rm`) after execution
- Temp workspace directory is deleted
- On timeout, container is force-killed before cleanup

## Future: Firecracker

For stronger isolation (multi-tenant, untrusted code), Firecracker microVMs can replace Docker containers. This is not required for v1 where the user trusts their own code.
