# Portable Test Guide

Use this guide before publishing an alpha release.

## 1. Copy Or Clone

Copy the repository without `node_modules`, `artifacts`, environment files, or package archives. On the target machine:

```bash
cd dsh-conversation-accents
node --version
npm ci
npm test
npm run pack:check
```

Node.js must be version 20 or newer. The default commands must not require a running DSH service.

For an install-only smoke test, copy the generated `.tgz` instead of the repository:

```bash
mkdir dsh-conversation-accents-alpha
cd dsh-conversation-accents-alpha
tar -xzf ../dsh-conversation-accents-0.1.0-alpha.1.tgz --strip-components=1
npm install --omit=dev
```

The npm archive contains the generated Client bundle and runtime dependencies metadata, but intentionally excludes tests and live scripts.

## 2. Install Into A Disposable DSH Profile

```bash
dsh plugin --profile web add link:$(pwd)
```

Restart DSH Web and hard-refresh the browser. Do not test first in a profile containing irreplaceable sessions or settings.

## 3. Functional Matrix

Verify each item in light and dark mode:

- master switch off: plugin colors disappear and histories remain interactive;
- master switch on: the remembered preset returns;
- Native: assistant Markdown accents disappear while built-in Tool call and Think accents remain;
- built-in presets: headings, strong, emphasis, links, quotes, inline code, and fenced code use the selected palette;
- plain assistant text remains the DSH system color;
- successful named tools show green icons and blue titles;
- successful generic `Tool call` rows show green icons and normal-weight blue titles;
- failed and stopped tools keep DSH error/warning indicators;
- running Think text is gold and remains plain text;
- settled Think Markdown renders safely and the completed icon is gold;
- custom palette create, edit, import, export, select, and delete work;
- settings fit a 390px-wide viewport without horizontal overflow.

Use `SHOWCASE_PROMPT.md` in a new session to generate a repeatable visual sample.

## 4. History Performance

Test at least:

- a short conversation;
- a conversation with 40-50 Think/tool rows;
- repeated history pagination if available.

The history must become interactive before all progressive Think Markdown conversion finishes. Compare the master switch on and off; enabled colors must not cause a sustained loading state or input freeze.

An optional live smoke test is available when you can provide a sanitized session title:

```bash
DSH_E2E_ALLOW_LIVE=1 \
DSH_E2E_BASE_URL=http://127.0.0.1:3080 \
DSH_E2E_BROWSER_PATH=/path/to/chrome \
DSH_E2E_SESSION_TITLE="Sanitized test session" \
npm run verify:history
```

## 5. Record Results

Record:

- operating system;
- Node.js version;
- DSH version or commit;
- browser version;
- plugin version;
- short/long history result;
- light/dark and mobile result;
- any sanitized console error.

## Recovery

If DSH becomes slow, keep the Host master switch off. If settings cannot be reached, remove the linked plugin and restart DSH Web:

```bash
dsh plugin --profile web remove dsh-conversation-accents
```
