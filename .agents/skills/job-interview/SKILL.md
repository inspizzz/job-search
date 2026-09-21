---
name: job-interview
description: Prepare a selected candidate for a specific job interview using the posting, submitted documents and previous-stage feedback, or run a mock interview. Use for /interview or scheduled job-interview preparation.
---

# Interview

Read the [Codex instructions](../../../AGENTS.md) and
[shared rules](../../../CLAUDE.md), then follow the
[source workflow](../../../.claude/commands/interview.md).
Establish the active candidate before reading personal information. Replace
`<slug>` and `<profile>` with that selected profile and quote shell paths.

Use `$job-interview` with the user's arguments. Translate Claude tools using `AGENTS.md`;
state tools run from the repository root. Keep all state and outputs inside the
selected ignored profile. Report validation errors without bypassing profile checks.
