# ADR-0003: Docker Sandbox

## Status

Accepted

## Context

Benchmark tasks require running untrusted agent-generated code. We need an isolation mechanism that prevents agents from affecting the host system, exfiltrating data, or interfering with other runs.

## Decision

Use Docker containers as the v1 sandbox mechanism.

## Rationale

- **Sufficient isolation**: Docker provides process, filesystem, and network isolation adequate for self-hosted deployments where users trust their own code.
- **Simple operations**: Docker is widely available and understood. No special kernel modules or hypervisor setup required.
- **Fast startup**: Container startup time (~1-2s) is acceptable for benchmark workloads.
- **Resource limits**: Native support for memory caps, CPU limits, and timeouts.
- **Network control**: `--network none` provides complete network isolation.

## Alternatives Considered

- **Firecracker**: Stronger isolation (VM-level), but requires KVM, more complex setup, and slower for v1 iteration.
- **gVisor**: Good middle ground but adds operational complexity with limited benefit for self-hosted.
- **Local subprocess**: No isolation, unacceptable security risk.

## Consequences

- Docker must be available on the host machine.
- `repobench/sandbox:latest` base image must be built and maintained.
- Network policy must be enforced via Docker network modes.
- Future upgrade path to Firecracker is preserved — sandbox interface is abstract.
