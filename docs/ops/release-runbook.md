# Release Runbook

## Pre-Release Checklist

- [ ] All CI checks pass on `dev` branch
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green locally
- [ ] CHANGELOG.md updated with release notes
- [ ] Version bumped in root `package.json`
- [ ] Integration tests pass against local infrastructure
- [ ] Security audit: `pnpm audit --audit-level=high`

## Release Process

```bash
# 1. Merge dev → main
git checkout main
git merge dev

# 2. Tag the release
git tag -a v0.x.x -m "Release v0.x.x"

# 3. Push tag (triggers release workflow)
git push origin main --tags

# 4. Verify GitHub Actions release workflow completes

# 5. Create GitHub Release from tag with release notes
```

## Post-Release

- [ ] Verify release artifacts are published
- [ ] Update documentation if needed
- [ ] Announce in relevant channels
