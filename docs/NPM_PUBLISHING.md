# Automatic npm Publishing

This repository publishes prerelease packages through GitHub Actions and npm Trusted Publishing. No long-lived npm token is stored in GitHub.

## One-time npm setup

The package name is currently unpublished. npm's Trusted Publisher is configured from a package's settings, so bootstrap this first release once from a machine where the npm account is logged in:

```bash
npm login
npm publish --access public --tag alpha
```

After the first package is created, open its publishing settings on npmjs.com and add a **Trusted Publisher** with:

- Provider: GitHub Actions
- Organization or user: `YaoaY`
- Repository: `dsh-conversation-accents`
- Workflow filename: `publish.yml`
- Environment: leave empty unless the workflow is deliberately configured with an environment

The package name must be available, and the npm account must be allowed to publish public packages. Enable two-factor authentication for publishing on the npm account.

## Publish a release

After Trusted Publishing is configured, future releases do not need `npm login` or an npm token. They are published by pushing a matching version tag:

```bash
npm test
git add package.json CHANGELOG.md
git commit -m "release: v0.1.0-alpha.1"
git tag v0.1.0-alpha.1
git push origin main --tags
```

Pushing `v0.1.0-alpha.1` starts `.github/workflows/publish.yml`. The workflow:

1. Installs dependencies with `npm ci`.
2. Runs `npm test`.
3. Checks that the tag and package version match.
4. Publishes the package with provenance and the `alpha` dist-tag.

Beta versions use the `beta` dist-tag. Release candidates use `next`. Stable versions are intentionally rejected by the current automatic workflow until the release policy is changed.

## Verify

```bash
npm view dsh-conversation-accents dist-tags versions
npm install --global dsh-conversation-accents@alpha
dsh plugin --profile web add dsh-conversation-accents@alpha
```

The global npm install is only a package smoke test; DSH users should use the `dsh plugin` command.
