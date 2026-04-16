# GitHub Integration

## Approach

RepoBench integrates with GitHub in two modes:

### Mode 1: Personal Access Token (v1)

User provides a GitHub PAT with `repo` scope. RepoBench uses it for:

- Fetching repository metadata
- Listing merged pull requests
- Downloading PR diffs
- Cloning repository at specific commits

**Pros**: Simple setup, no app installation required.
**Cons**: Token scoped to individual user, rate limits lower.

### Mode 2: GitHub App (post-v1)

RepoBench GitHub App installed on organization/repo. Provides:

- Higher API rate limits
- Webhook-driven automation (nightly benchmarks, new PR triggers)
- Fine-grained permissions
- Organization-wide installation

## API Usage

| Endpoint                                                     | Purpose             |
| ------------------------------------------------------------ | ------------------- |
| `GET /repos/:owner/:repo`                                    | Repository metadata |
| `GET /repos/:owner/:repo/pulls?state=closed`                 | Merged PR listing   |
| `GET /repos/:owner/:repo/pulls/:number` (diff accept header) | PR diff content     |
| `GET /repos/:owner/:repo/git/trees/:sha`                     | File tree at commit |

## Rate Limiting

- PAT: 5,000 requests/hour
- GitHub App: 5,000 requests/hour per installation
- RepoBench implements exponential backoff on 429 responses

## Webhook Events (post-v1)

| Event                          | Action                           |
| ------------------------------ | -------------------------------- |
| `pull_request.closed` (merged) | Queue task creation              |
| `schedule` (cron)              | Nightly benchmark runs           |
| `release.published`            | Pre-release benchmark validation |
