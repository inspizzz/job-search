---
name: job-form-answers
description: Draft factual answers to a selected candidate's job-application form questions within word or character limits. Use for /form-answers, supporting statements or application competency questions.
---

# Form Answers

Read the [Codex instructions](../../../AGENTS.md) and
[shared rules](../../../CLAUDE.md), then follow the
[source workflow](../../../.claude/commands/form-answers.md).
Establish the active candidate before reading personal information. Replace
`<slug>` and `<profile>` with that selected profile and quote shell paths.

Use `$job-form-answers` with the user's arguments. Translate Claude tools using `AGENTS.md`;
state tools run from the repository root. Keep all state and outputs inside the
selected ignored profile. Report validation errors without bypassing profile checks.
