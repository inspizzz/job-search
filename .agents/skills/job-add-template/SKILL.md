---
name: job-add-template
description: Register, list, activate, or restore a custom LaTeX CV or cover-letter template in this job-search workspace. Use for the former /add-template workflow.
---

# Register a shared application template

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/add-template.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-add-template`, `$job-add-template --list`, `$job-add-template --use <name>`, or `$job-add-template --use default`. This is shared workspace development; no candidate profile is needed.

Read the source's template registration procedure. Store only anonymized placeholder content in `templates/`, test-compile with dummy data, and visually inspect the PDF using `AGENTS.md`. Activation changes the shared managed block and therefore applies to every profile; make that scope clear when reporting the change. Preserve content outside the managed markers.
