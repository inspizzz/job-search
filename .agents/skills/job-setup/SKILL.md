---
name: job-setup
description: Onboard or update a job seeker's profile from career documents, a CV import, or an interview. Supports section-only updates. Does not configure developer tools or Codex itself.
---

# Set up a candidate profile

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/setup.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-setup` or `$job-setup --section search` (also `skills`, `experience`, and other source sections). Establish the person first, then follow the source's document import, single CV, or interview path. A section-only update stays within the requested section.

Keep source-backed facts separate from inferred observations and preserve conflict resolution. Personal CV statements go in `<profile>/profile/03-cv-statements.md`; personal writing or letter patterns go in `<profile>/profile/writing-preferences.md`. Never populate shared `03`, `05`, or `06` guides with candidate-specific material. Read any existing personal notes before merging. Show proposed document-import changes before applying them, honoring approval already given for that concrete change set.
