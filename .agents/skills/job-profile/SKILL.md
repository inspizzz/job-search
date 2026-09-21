---
name: job-profile
description: Select, inspect, list, or scaffold a candidate profile in this job-search workspace. Use for switching between job seekers or the former /profile command.
---

# Select a job-search profile

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/profile.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-profile`, `$job-profile my-profile`, `$job-profile --list`, or
`$job-profile --new <slug>`. List only local manifests, excluding the reserved
`example` scaffold; load candidate documents only after selection.

For a new person, follow the source's slug validation and copy the blank
`profiles/example/` scaffold. Verify Git ignores the destination before writing
personal data. Initialize the tracker header and seen state. Never copy a
populated person's directory or add a personal roster to shared instructions.
