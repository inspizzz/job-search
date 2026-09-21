---
name: job-rank
description: Batch-score a selected candidate's scraped job postings into a shortlist with fit scores, honest gaps, eligibility flags and deadline urgency. Use for /rank or ranking already scraped jobs.
---

# Rank

Read the [Codex instructions](../../../AGENTS.md) and
[shared rules](../../../CLAUDE.md), then follow the
[source workflow](../../../.claude/commands/rank.md).
Establish the active candidate before reading personal information. Replace
`<slug>` and `<profile>` with that selected profile and quote shell paths.

Use `$job-rank` with the user's arguments. Translate Claude tools using `AGENTS.md`;
state tools run from the repository root. Keep all state and outputs inside the
selected ignored profile. Report validation errors without bypassing profile checks.
