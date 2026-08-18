# Release Checklist

## Repository

- [ ] Set real `repository`, `homepage`, and `bugs` fields in `package.json` after choosing the public host.
- [ ] Confirm the package name is available or move it under an npm scope.
- [ ] Log in to npm and configure a Trusted Publisher for `YaoaY/dsh-conversation-accents`:
  - Provider: GitHub Actions
  - Repository: `YaoaY/dsh-conversation-accents`
  - Workflow: `publish.yml`
  - Environment: leave empty unless an npm environment is deliberately configured.
- [ ] For the unpublished first release, run a one-time `npm login` and `npm publish --access public --tag alpha`, then configure the npm Trusted Publisher.
- [ ] Confirm the npm account can publish public packages and has 2FA enabled.
- [ ] Confirm LICENSE copyright text and maintainer contact details.
- [ ] Ensure screenshots use a disposable profile and fictional content.
- [ ] Search for private paths, hostnames, session titles, tokens, and credentials.

## Quality

- [ ] Run `npm ci` in a clean clone.
- [ ] Run `npm test` on Node.js 20 and 22.
- [ ] Run `npm run build` and confirm generated files under `dist/` have no unexpected diff.
- [ ] Run `npm run pack:check` and inspect every packed file.
- [ ] Run the portable test guide on a second computer.
- [ ] Test light/dark, 390px viewport, master switch, Native, custom palettes, generic Tool call, and running/settled Think.
- [ ] Test short and long histories with colors enabled and disabled.
- [ ] Test raw HTML and dangerous Markdown URL regression cases.

## Compatibility

- [ ] Record the tested DSH version or commit.
- [ ] Record browser and Node.js versions.
- [ ] Verify documented DOM contracts still exist.
- [ ] Confirm uninstall and recovery instructions.

## Release

- [ ] Replace `Unreleased` with the release date in `CHANGELOG.md`.
- [ ] Tag the exact tested commit.
- [ ] Create the package from a clean checkout.
- [ ] Publish as an alpha prerelease by pushing a matching tag such as `v0.1.0-alpha.1`; do not use a stable tag yet.
- [ ] Verify the installed package in a fresh DSH profile.
