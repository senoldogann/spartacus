# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |
| < 0.1.0 | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability in RepoBench, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **contact@senoldogan.dev** with the subject line `RepoBench security report: <short summary>` and include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)
5. Any logs, screenshots, or proof-of-concept material needed to reproduce safely

Please share only the minimum data required to reproduce the issue. If the report involves secrets, credentials, or private repository content, mention that explicitly so handling can stay private.

We will acknowledge receipt within 2 business days and provide an initial triage update within 5 business days.

## Security Model

RepoBench processes source code on the worker host and uses Docker as a verification boundary. Key security boundaries:

- **Verification sandbox**: Patch application and verification commands run inside Docker containers with restricted network access
- **Worker-host execution**: Repository cloning, prompt construction, and hosted/local agent API calls still happen on the worker host
- **Code privacy**: Repository data stays on your infrastructure by default; hosted providers send selected prompt context off-box only when explicitly enabled
- **Secret masking**: Selected API responses sanitize configured secrets; raw local artifacts should be treated as internal data
- **Artifact retention**: Artifacts are stored under the configured local artifact directory in the current implementation

## Disclosure Policy

We follow coordinated disclosure. We will:

1. Confirm the vulnerability
2. Develop and test a fix
3. Release the fix
4. Publicly disclose the issue after the fix is available

## Maintainer Contact

RepoBench is maintained by **Senol Dogan**.

- Email: **contact@senoldogan.dev**
- Website: **https://www.senoldogan.dev**
