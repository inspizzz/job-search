---
name: job-expand
description: Enrich a selected candidate's profile with source-traceable competencies from their career documents and public professional work, following the former /expand workflow.
---

# Expand a candidate's documented competencies

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/expand.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-expand`. Establish the active profile and read existing competencies before discovery. Follow the source's document scan, public-work research, deduplication, and grouped proposed additions.

Distinguish observed competencies from inferences. Present the proposed additions for review, then apply only authorized items. Keep additions within the active profile and annotate their sources so repeat runs do not duplicate content.
