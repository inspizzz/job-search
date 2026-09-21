---
name: job-application-assistant
description: Evaluate job fit, tailor an individual CV or cover letter, prepare interviews, or discuss career strategy for a selected candidate. For the full reviewed application workflow use job-apply.
---

# Job application advice and individual documents

Read the repository's [Codex instructions](../../../AGENTS.md) and
[shared workspace rules](../../../CLAUDE.md) if not already loaded.
Then read and follow the [source workflow](../../../.claude/skills/job-application-assistant/SKILL.md),
applying the Codex tool translations and the specific adaptations below.
Paths in that workflow are relative to the repository root unless stated otherwise.
This adapter is part of this repository; keep its source workflow available.

Establish the active profile before using candidate information. Follow the source for the requested step only. For a complete application, use `$job-apply` and its reviewer and PDF requirements.

Relative references `03-writing-style.md`, `05-cv-templates.md`, and `06-cover-letter-templates.md` in the source mean files in `.claude/skills/job-application-assistant/`, not this adapter directory. The source's bare `cv/` means `<profile>/cv/`.

Read personal statement variants from `<profile>/profile/03-cv-statements.md` and optional personal style notes from `profile/writing-preferences.md`. Apply `CLAUDE.md`'s verification checklist and `AGENTS.md`'s compilation/visual inspection requirements even when creating only one document.

For an existing application's interview use `$job-interview`; form questions use
`$job-form-answers`. Apply the shared `09-web-research.md` and `10-eligibility.md`
references when evaluating a posting, alongside the active profile's framework.
