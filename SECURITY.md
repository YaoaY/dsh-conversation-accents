# Security Policy

## Supported Versions

Only the latest alpha release and the current default branch receive security fixes.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately to the repository maintainers. Include:

- the released version or commit;
- the DSH Web and browser versions;
- a minimal reproduction without private conversation content;
- the impact and any suggested mitigation.

Do not include credentials, tokens, private session exports, or unredacted screenshots in a report.

## Security Scope

The plugin processes assistant and Think content in the browser. Important security boundaries are:

- raw HTML must remain escaped;
- dangerous Markdown URL protocols must not become active links;
- palette imports must remain structured data and must not accept CSS;
- Host writes must remain loopback-only and same-origin;
- the plugin must not add telemetry or send conversation content to external services.

Security fixes should add a regression test before release.
