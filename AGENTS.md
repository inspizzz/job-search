# Job Application Workspace — Codex

Read `CLAUDE.md` at the repository root before working here. It is the shared
source for profile routing, application requirements, and the final verification
checklist. The adaptations below apply when running those workflows in Codex.

## Session routing

- Workspace development (skills, CLIs, configuration, documentation, git) needs
  **no active profile**. Proceed without a profile-selection question.
- Before any work on behalf of a job seeker, use the person already named in this
  session or ask whose profile to use. Never infer it from the working directory,
  previous sessions, or which profile has more data.
- Read the active profile's `PROFILE.md`, `profile/00-summary.md`,
  `profile/01-candidate-profile.md`, and `profile/02-behavioral-profile.md` before
  answering. Load evaluation, search, and interview references when needed, as
  specified in `CLAUDE.md`. Announce the active profile and reload on a switch.
- Candidate facts and outputs stay in `profiles/<active-slug>/`. Shared tooling
  and formatting references can be read for any profile. Never use another
  person's examples as evidence about the active candidate.
- Replace `<profile>` with the actual profile directory and quote shell paths.
  Run repository-relative commands from the repository root; compile LaTeX from
  the directory containing the document.

## Personal data stays local

Only the blank `profiles/example/` scaffold is tracked. Real profiles are ignored
by Git. Never select `example` as a person, populate it, force-add a real profile,
or copy identity/contact details into shared files. Discover available people
from local profile manifests; do not maintain a roster in tracked documentation.
Create new profiles from the blank scaffold and verify their paths are ignored.

## Workflow entry points

Codex skills live in `.agents/skills/`. Read the relevant `SKILL.md` and its linked
workflow before executing it. The `.claude/` files remain the workflow source;
do not maintain a second copy of the full procedures.

| Task / Claude command | Codex skill |
| --- | --- |
| `/profile` | `$job-profile` |
| `/setup` | `$job-setup` |
| `/apply` | `$job-apply` |
| `/expand` | `$job-expand` |
| `/reset` | `$job-reset` |
| `/add-template` | `$job-add-template` |
| `/add-portal` | `$job-add-portal` |
| `/scrape` | `$job-scraper` |
| `/upskill` | `$job-upskill` |
| `/rank` | `$job-rank` |
| `/outcome` | `$job-outcome` |
| `/interview` | `$job-interview` |
| `/form-answers` | `$job-form-answers` |
| `/html-report` | `$job-html-report` |
| Individual fit, CV, cover-letter, interview or career requests | `$job-application-assistant` |

The seven existing `*-search` skills provide portal CLIs. Use `job-scraper` for
profile-based searches across sources. CLI development and smoke checks need no
candidate profile. Command examples use `.agents/skills/<name>/cli/src/cli.ts`;
legacy `skills/<name>/...` permission strings are not repository paths.

## Translate Claude tools to Codex

- `Read`, `Glob`, `Grep`: use file-reading tools and `rg` / `rg --files`.
- `Write`, `Edit`: use file-editing tools, preserving unrelated changes.
- `Bash`: use the shell tool under the session's existing permissions.
- `WebSearch`, `WebFetch`: use available web tools and verify current sources.
- `AskUserQuestion`: use an available question tool, or ask in chat if that tool
  cannot collect the required answer. Required choices must receive an answer;
  proceed with independent work while waiting. Respect decisions already given.
- `Skill`: read and follow the corresponding Codex skill. `$ARGUMENTS` means the
  user's text after the skill name, not a shell environment variable. Translate
  suggested follow-up slash commands using the table above.
- `Agent` / `general-purpose`: use a Codex reviewer subagent when the invoked
  workflow calls for one and the runtime permits it. Pass only the active
  profile's references, the posting, and inline drafts. If unavailable, perform
  a separate critique pass and disclose that independent review was unavailable.
  Never claim a separate reviewer ran when it did not.
- Claude frontmatter (`allowed-tools`, `context: fork`, `model: sonnet`) and
  `.claude/settings.json` are Claude settings, not Codex permissions or model
  selections. Do not translate them into blanket shell or network approval.
- `.claude/agents/gemini-research-expert.md` describes an optional Gemini CLI
  workflow. Normal Codex research uses native web tools; Gemini is not required.
  Use Gemini only when explicitly requested and installed.

## Application quality

Preserve fit-first evaluation, factual accuracy, honest gaps, writing style, and
the final checklist in `CLAUDE.md`. Present fit before drafting; an existing
explicit instruction to draft is sufficient authorization to continue. Otherwise
ask whether to proceed. Preparing files does not submit an application.

Keep the existing requirement to mention **Claude Code** when the candidate's
documented AI-tooling experience is discussed. Switching assistants is not evidence
of a new candidate skill; never invent experience with Codex or any other tool.

For PDFs, replace Claude's "Read the PDF" instruction with actual visual
inspection: use a PDF-capable viewer or render **every page** with `pdftoppm` and
open the resulting images. `pdfinfo` checks page counts; `pdftotext -layout`
checks the CV text layer. Neither substitutes for visual inspection. Stock
templates require a two-page CV (LuaLaTeX) and a one-page letter (XeLaTeX).
An `ACTIVE-TEMPLATE` block overrides the stock engine, format, and page limit.
If compilation or rendering is unavailable, report the incomplete check; do not
present unverified PDFs as finished. Keep `.tex` and `.pdf` outputs, and clean up
only temporary artifacts created by the current run.

## Maintaining this integration

- Keep new skill descriptions specific to job-search work so development requests
  do not accidentally invoke onboarding or destructive reset workflows.
- Personal setup observations belong in the active profile, not shared writing
  or LaTeX guides. Read `profile/03-cv-statements.md` for personal CV statements;
  optional personal style notes live in `profile/writing-preferences.md`.
- When changing a shared `.claude/` workflow, check its Codex adapter and update
  `docs/CODEX.md` if invocation or tool behavior changes.
- Validate documentation and skill references after instruction-only changes.
  For CLI code changes, run that CLI's relevant tests and typecheck. Some portal
  tests call live services; distinguish network failures from code regressions.

See `docs/CODEX.md` for setup, command examples, and integration boundaries.
