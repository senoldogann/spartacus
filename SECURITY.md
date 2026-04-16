# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability in RepoBench, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **security@repobench.dev** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix within 5 business days.

## Security Model

RepoBench processes source code and runs agents in sandboxed environments. Key security boundaries:

- **Sandbox isolation**: Agent runs execute inside Docker containers with restricted network access
- **Code privacy**: Repository data is stored locally — no code is sent to external services beyond the agent APIs
- **Secret masking**: Logs and artifacts are scrubbed for secrets before storage
- **Artifact retention**: Configurable retention policies for benchmark artifacts

## Disclosure Policy

We follow coordinated disclosure. We will:

1. Confirm the vulnerability
2. Develop and test a fix
3. Release the fix
4. Publicly disclose the issue after the fix is available
