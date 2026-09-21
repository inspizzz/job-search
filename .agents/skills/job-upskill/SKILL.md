---
name: job-upskill
description: Compare a selected candidate's tracked jobs or one target posting with their profile to identify skill gaps and save a prioritized learning plan with current resources. Use for /upskill or career learning plans.
---

# Identify skill gaps and plan learning

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/skills/upskill/SKILL.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-upskill` for aggregate mode or `$job-upskill <posting URL>` for targeted mode. Establish the profile, then follow the source's gap analysis and report workflow. Targeted mode must not read the tracker.

For aggregate mode, use tracked applications and recorded gaps from ranked jobs in the same profile, deduplicated by URL/company+role. If both sources are missing or empty, suggest a target posting or searching/ranking first. Do not invent job requirements or fit scores when data is missing. Label inferences from tracker notes separately from verified posting requirements.

Search for real, current learning resources using the current year. Save the report under `<profile>/upskill/` and use the source's aggregate or targeted filename convention.
