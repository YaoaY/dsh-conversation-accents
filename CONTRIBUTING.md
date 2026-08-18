# Contributing

Thanks for contributing to `dsh-conversation-accents`.

## Development Setup

Use Node.js 20 or newer:

```bash
npm ci
npm test
```

TypeScript sources under `src/` generate all Host, shared, declaration, and Client bundle artifacts under `dist/`. After editing source, run:

```bash
npm run build
npm test
git diff -- dist
```

Do not edit generated files under `dist/` directly.

## Change Boundaries

- Keep styles scoped to documented DSH conversation contracts.
- Do not add global shell, composer, settings, or body styling.
- Treat conversation text as untrusted input.
- Preserve the master switch, Host/localStorage migration, and native fallback behavior.
- Do not add telemetry or external network calls to the plugin.
- Do not commit real conversation content, screenshots, absolute local paths, credentials, or machine-specific fixtures.

## Tests

The default test suite must run without DSH Web, a browser, a network connection, or private session data:

```bash
npm test
npm run typecheck
npm run pack:check
```

Live GUI and history checks are opt-in and require sanitized environment variables. They must never be part of the default CI job.

When changing Think or Tool call behavior, include coverage for:

- enabled and disabled color states;
- running, successful, failed, and stopped tool states;
- streaming versus settled Think content;
- long-history scheduler behavior;
- dangerous Markdown URLs and raw HTML;
- light and dark theme selectors.

## Pull Requests

A pull request should include:

- a focused explanation of the behavior change;
- tests for the changed contract;
- confirmation that `npm test` passes;
- confirmation that the generated bundle is current;
- compatibility notes for any DSH DOM contract used.

Keep pull requests small enough to review. Separate visual changes from unrelated refactors.
