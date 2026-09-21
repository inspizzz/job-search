---
name: job-reset
description: Reset a specifically selected job seeker's profile data, source documents, or both when the user requests a reset. Does not apply to code cleanup, git resets, or development setup.
---

# Reset a selected candidate's data

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/reset.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-reset profile`, `$job-reset documents`, or `$job-reset all`. Resolve the person and scope, inventory the exact files, and follow the source's explicit `RESET` confirmation before destructive changes. Reading this skill or requesting Codex integration does not authorize a reset.

Resolve and verify every target is contained in the active profile before deletion; do not follow symlinks into other profiles or outside the workspace. Delete only the inventoried and confirmed targets. Preserve document directories, `.gitkeep`, `documents/README.md`, shared guides, templates, and scoring frameworks. Preserve the manifest's display name and slug as specified in the source's execution section.

If `profile/writing-preferences.md` exists, include it explicitly in the proposed profile reset and confirmation. Tracker entries, scraper history, CVs, letters, and upskill reports are outside the documented reset scope unless separately requested.
