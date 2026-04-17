# Release Runbook

## Pre-Release Checklist

- [ ] All CI checks pass on the release commit
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green locally
- [ ] CHANGELOG.md updated with release notes
- [ ] Version bumped in root `package.json`
- [ ] Integration tests pass against local infrastructure
- [ ] Security audit: `pnpm audit --audit-level=high`

## Release Process

```bash
# 1. Ensure main contains the release commit
git checkout main
git pull --ff-only origin main

# 2. Tag the release
git tag -a v0.x.x -m "Release v0.x.x"

# 3. Push commit and tag (triggers release workflow)
git push origin main --tags

# 4. Verify GitHub Actions release workflow completes

# 5. Confirm the GitHub Release was created from the tag
```

## Post-Release

- [ ] Verify the GitHub Release contains generated notes
- [ ] Update documentation if needed
- [ ] Announce in relevant channels
