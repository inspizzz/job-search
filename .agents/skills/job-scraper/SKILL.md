---
name: job-scraper
description: Find new jobs for a selected candidate across the workspace's portal CLIs and web search, deduplicate against their seen jobs and tracker, and rank matches. Use for profile-based searches or /scrape.
---

# Find and track new job matches

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/skills/job-scraper/SKILL.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-scraper`, `$job-scraper broad`, or `$job-scraper <focus area>`. Establish the profile and load its search strategy before making requests. Use that profile's market and commute constraints rather than copying the source's illustrative London/South West defaults.

Read the relevant existing `*-search` skill before using its CLI. Run commands from the repository root with `.agents/skills/...` paths. Bun loads a local `.env`; do not print credentials. A blocked portal or missing key is an unavailable source, not evidence of no vacancies.

Initialize missing seen state to `{"seen": {}}` and a missing tracker with the CSV header in `profiles/README.md`. Preserve existing `first_seen` dates and evaluated/skipped statuses when merging results. Only show real, open listings, and write state solely inside the active profile. Independent requests may run in parallel with available tools; no Claude `Agent` tool is required.
