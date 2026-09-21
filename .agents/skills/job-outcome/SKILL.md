---
name: job-outcome
description: Record outcomes for a selected candidate's job applications, preserve submitted materials, or draft follow-ups for quiet applications. Use for /outcome, application status updates or job-application follow-ups.
---

# Outcome

Read the [Codex instructions](../../../AGENTS.md) and
[shared rules](../../../CLAUDE.md), then follow the
[source workflow](../../../.claude/commands/outcome.md).
Establish the active candidate before reading personal information. Replace
`<slug>` and `<profile>` with that selected profile and quote shell paths.

Use `$job-outcome` with the user's arguments. Translate Claude tools using `AGENTS.md`;
state tools run from the repository root. Keep all state and outputs inside the
selected ignored profile. Report validation errors without bypassing profile checks.
