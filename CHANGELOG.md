# Changelog

All notable changes to this project are documented here.

## 0.1.0-alpha.1 - Unreleased

- Added scoped assistant Markdown semantic palettes and custom palette import/export.
- Added the `colorsEnabled` master switch with legacy settings migration.
- Added named-tool success icons and titles plus generic `Tool call` accents.
- Added running and settled Think gold styling with safe settled CommonMark.
- Added loopback Host persistence, localStorage fallback, and cross-tab synchronization.
- Added frame-batched Think rendering and long-history performance checks.
- Added deterministic scheduler, security, migration, and Host race regression tests.
- Moved the full editor into its own Settings section and made inline-code backgrounds configurable.
- Added abortable Host requests, a typed trailing-save queue, retry UI, and correct 5xx persistence errors.
- Migrated Host and shared modules to strict TypeScript with generated declarations and public API type checks.
- Hardened Think teardown so Host-owned replacements are never overwritten by stale cached text.
