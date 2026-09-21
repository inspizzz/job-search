---
name: job-apply
description: Prepare a tailored job application from a posting URL or pasted description, including fit evaluation, CV, cover letter, review, and compiled PDF verification. Does not submit applications.
---

# Prepare a reviewed job application

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/apply.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-apply <posting URL or text>`. Resolve the active profile, evaluate fit, and present it before drafting. Honor an explicit instruction already given to draft; otherwise obtain the go-ahead required by the workflow.

Read `<profile>/profile/03-cv-statements.md` and optional `profile/writing-preferences.md` alongside the shared writing/template guides. Use the candidate's facts, English for the CV, and the posting's language for the letter. Respect any `ACTIVE-TEMPLATE` override.

Follow the source's reviewer brief using a Codex subagent when available and permitted, keeping the reviewer read-only. If independent review is unavailable, perform and label a separate self-review. Independently verify company claims before incorporating feedback.

Compilation and visual inspection of every PDF page are required, using the Codex PDF adaptations in `AGENTS.md`. Run the final checklist once on the final files. Report both `.tex` and `.pdf` paths and any incomplete checks; do not repeat the source's obsolete suggestion to compile after delivery.
