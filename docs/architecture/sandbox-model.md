# Sandbox Model

## Design Principles

1. **Isolation**: Agent runs must not affect the host system
2. **Reproducibility**: Same task + same agent = same conditions
3. **Security**: No secret leakage, no network exfiltration
4. **Cleanup**: No persistent side effects after run completion

## Implementation (v1: Docker)

Each task attempt runs in an ephemeral Docker container:

```
docker run --rm \
  --name repobench-<uuid> \
  --memory 2048m \
  --cpus 2 \
  --network none \
  -v /tmp/repobench-ws-xxx:/workspace:ro \
  repobench/sandbox:latest \
  <agent-command>
```

### Configuration

| Parameter                 | Default                  | Description                        |
| ------------------------- | ------------------------ | ---------------------------------- |
| `SANDBOX_TIMEOUT_MS`      | 300000 (5 min)           | Maximum execution time             |
| `SANDBOX_NETWORK_ENABLED` | false                    | Network access for agent API calls |
| `SANDBOX_DOCKER_IMAGE`    | repobench/sandbox:latest | Base image                         |
| Memory limit              | 2048 MB                  | Container memory cap               |
| CPU limit                 | 2 cores                  | Container CPU cap                  |

### Network Policy

- **Default**: `--network none` — no network access
- **Agent API mode**: Planned, but not yet enforced in runtime. `AGENT_API_ONLY` remains a reserved future mode until host-level egress filtering is implemented.
- Current runtime support: `DENY_ALL` only

### Workspace Mounting

- Source snapshot is copied to a temp directory
- Mounted as read-only (`ro`) into the container at `/workspace`
- Agent writes output to stdout/stderr
- Patches captured from agent output

### Cleanup

- Container is removed (`--rm`) after execution
- Temp workspace directory is deleted
- On timeout, container is force-killed before cleanup

## Future: Firecracker

For stronger isolation (multi-tenant, untrusted code), Firecracker microVMs can replace Docker containers. This is not required for v1 where the user trusts their own code.
