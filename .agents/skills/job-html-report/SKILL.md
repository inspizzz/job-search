---
name: job-html-report
description: Generate a private offline dashboard from a selected candidate's job-application tracker. Use for /html-report or a local application progress report.
---

# Html Report

Read the [Codex instructions](../../../AGENTS.md) and
[shared rules](../../../CLAUDE.md), then follow the
[source workflow](../../../.claude/commands/html-report.md).
Establish the active candidate before reading personal information. Replace
`<slug>` and `<profile>` with that selected profile and quote shell paths.

Use `$job-html-report` with the user's arguments. Translate Claude tools using `AGENTS.md`;
state tools run from the repository root. Keep all state and outputs inside the
selected ignored profile. Report validation errors without bypassing profile checks.
