---
name: job-add-portal
description: Build, list, and verify a public job-board search CLI skill for this workspace, following the former /add-portal workflow. Use for portal integration development, not ordinary job searches.
---

# Add a job-board search integration

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/commands/add-portal.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Use `$job-add-portal <portal URL>` or `$job-add-portal --list`. Portal development and test queries need no candidate profile. Establish a profile only if the user elects to update that person's search strategy.

For list mode, restrict `.agents/skills/*/SKILL.md` to portal skills with `cli/src/cli.ts` and `url-reference.md`; the directory also contains workflow adapters.

Follow reconnaissance, the portal CLI contract, live search/detail verification, and registration in the source. Emit Codex-compatible `name` and `description` frontmatter. Claude's `context: fork` and `allowed-tools` are optional Claude metadata, not Codex settings; all command paths must use `.agents/skills/<name>/cli/src/cli.ts`. Preserve access restrictions and do not claim live verification when a portal is blocked.
