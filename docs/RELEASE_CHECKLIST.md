# Release Checklist

## Repository

- [ ] Set real `repository`, `homepage`, and `bugs` fields in `package.json` after choosing the public host.
- [ ] Confirm the package name is available or move it under an npm scope.
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
- [ ] Publish as an alpha prerelease; do not use a stable tag yet.
- [ ] Verify the installed package in a fresh DSH profile.
