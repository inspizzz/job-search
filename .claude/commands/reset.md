# /reset - Reset Candidate Profile Data

> **Establish the active profile before Step 1.** This command operates on one person's data.
> If the user has not already named the person, ask with `AskUserQuestion` (available local profiles /
> Development) per the **Profile Routing** section of the root `CLAUDE.md`, then load
> `profiles/<slug>/PROFILE.md` and `profiles/<slug>/profile/00-summary.md` before proceeding.


> **`<profile>` is a placeholder, not a literal path.** Substitute the active profile's real
> directory (`profiles/my-profile`, for example) into every path *and every shell command*
> below before running it. A command containing a literal `<profile>` must never be executed.


You are resetting parts of the job search framework back to a blank state so the user can start fresh with `/setup`.

**This command is destructive.** Nothing is deleted until the user explicitly confirms. Follow these steps exactly in order.

---

## Step 0: Parse Scope from Arguments

Check `$ARGUMENTS` for a scope keyword:

- `profile` — clears candidate profile data from skill files only
- `documents` — deletes user-provided files from the `<profile>/documents/` folder only
- `all` — both of the above

If `$ARGUMENTS` is empty or does not contain a recognized scope keyword, ask:

> **What would you like to reset?**
>
> - **`profile`** — Clears candidate data from the skill files (profile, behavioral, STAR examples, profile statements). The framework structure and writing rules are preserved. Use this to re-run `/setup` from scratch.
>
> - **`documents`** — Deletes all files you've placed in the `<profile>/documents/` folder (CV PDFs, LinkedIn export, diplomas, references, past applications). The folder structure and `README.md` are preserved.
>
> - **`all`** — Both of the above.
>
> Reply with `profile`, `documents`, or `all`.

Wait for the user's response before continuing.

---

## Step 1: Show Exactly What Will Be Cleared

Before doing anything, show the user precisely what will be wiped.

### If scope includes `profile`:

Read the current state of these files and report whether each has content or is already empty:

- `<profile>/profile/00-summary.md`
- `<profile>/profile/01-candidate-profile.md`
- `<profile>/profile/02-behavioral-profile.md`
- `<profile>/profile/03-cv-statements.md`
- `<profile>/profile/writing-preferences.md` *(if present; personal style observations only)*
- `<profile>/profile/04-job-evaluation.md` *(strong/weak areas, career goals and motivation filters only — the scoring framework is preserved)*
- `<profile>/profile/07-interview-prep.md` *(STAR examples and STAR candidates sections only — framework structure is preserved)*
- `<profile>/PROFILE.md` *(display name, market and status reset to "Empty scaffold"; slug and paths preserved)*

The shared files in `.claude/skills/job-application-assistant/` (`03-writing-style.md`,
`05-cv-templates.md`, `06-cover-letter-templates.md`) are **never** touched by a reset — they hold
no personal data and are used by every profile.

Present as:

```
## Profile reset will clear:

- <profile>/PROFILE.md — [populated / already a scaffold]
  Display name, market and status reset. Slug and paths preserved.

- <profile>/profile/00-summary.md — [has content / already empty]
  Full file will be replaced with the placeholder summary template.

- <profile>/profile/01-candidate-profile.md — [has content / already empty]
  Full file will be replaced with a blank template.

- <profile>/profile/02-behavioral-profile.md — [has content / already empty]
  Full file will be replaced with a blank template.

- <profile>/profile/03-cv-statements.md — [has profile statements / already blank]
  Role-specific profile statements will be cleared back to the scaffold.

- <profile>/profile/writing-preferences.md — [has personal observations / already blank / absent]
  If present, personal style and letter patterns will be cleared; headings are preserved.

- <profile>/profile/04-job-evaluation.md — [has calibration / already blank]
  Strong/weak areas, career goals and motivation filters will be cleared. The scoring framework is preserved.

- <profile>/profile/07-interview-prep.md — [has STAR examples / already blank]
  STAR examples and any STAR candidate stubs will be cleared. Framework, tough questions, and roleplay guidelines are preserved.

The following shared files are NOT touched (framework rules, used by every profile):
  - .claude/skills/job-application-assistant/03-writing-style.md
  - .claude/skills/job-application-assistant/05-cv-templates.md
  - .claude/skills/job-application-assistant/06-cover-letter-templates.md
```

### If scope includes `documents`:

Use Glob to list all files present in `<profile>/documents/cv/`, `<profile>/documents/linkedin/`, `<profile>/documents/diplomas/`, `<profile>/documents/references/`, and `<profile>/documents/applications/`. Present as:

```
## Documents reset will delete:

<profile>/documents/cv/
  - [filename] or "(empty)"

<profile>/documents/linkedin/
  - [filename] or "(empty)"

<profile>/documents/diplomas/
  - [filename] or "(empty)"

<profile>/documents/references/
  - [filename] or "(empty)"

<profile>/documents/applications/
  - [subfolder/filename] or "(empty)"

<profile>/documents/README.md — NOT deleted (instructions file)
```

If all document subfolders are already empty, state "All document subfolders are already empty — nothing to delete." and skip the confirmation step for this scope.

---

## Step 2: Require Explicit Confirmation

Present the confirmation prompt:

> **This cannot be undone.**
>
> Type **`RESET`** (all caps) to confirm, or anything else to cancel.

Wait for the user's response.

- If the user types exactly `RESET`: proceed to Step 3.
- If the user types anything else: abort and tell them "Reset cancelled. Nothing was changed."

---

## Step 3: Execute the Reset

### Profile reset

**For `<profile>/PROFILE.md`**, reset the manifest table: keep the slug and profile-root rows
verbatim, set **Display name** to the person's name (unchanged), **Status** to
`Empty scaffold — run /setup to populate`, and **Market** to `Not set`. Leave the Contents table
intact.

**For `<profile>/profile/00-summary.md`**, replace the body below the `# Candidate Summary — <name>`
heading with placeholder tokens, keeping every section heading (Identity, Education, Professional
Experience, Technical Skills, Certifications, Publications, Awards, Behavioral Profile, What
Excites You, Target Sectors, Deal-breakers) and putting `[PLACEHOLDER]` values under each.

**For `<profile>/profile/04-job-evaluation.md`**, clear only the calibration values — the
strong/moderate/weak match areas, the career goals list, and the energizing/draining task lists —
back to `[PLACEHOLDER]` tokens. Leave every scoring table, weighting and verdict threshold intact:
that is framework, not candidate data.

**For `<profile>/profile/01-candidate-profile.md`**, replace the file content with:

```markdown
# Candidate Profile

<!-- Run /setup to populate this file -->

## Identity

## Education

## Professional Experience

## Independent Projects

## Technical Skills

## Publications

## Awards

## References
```

**For `<profile>/profile/02-behavioral-profile.md`**, replace the file content with:

```markdown
# Behavioral Profile

<!-- Run /setup to populate this file -->

## Overview

## Strongest Behavioral Traits

## How I Work Best

## Growth Areas

## Mapping to Job Posting Language

## Management Style Preferences

## Using This in Applications
```

**For `<profile>/profile/03-cv-statements.md`**, replace the whole file with the scaffold:

```markdown
# CV Profile Statements

Role-specific profile statement / elevator-pitch variants for this candidate. `/apply` picks the
one matching the target role and tailors it further. Formatting and LaTeX rules live in the shared
`.claude/skills/job-application-assistant/05-cv-templates.md`.

<!-- Populated by /setup. Aim for 2-3 variants covering the candidate's main role directions. -->

## [ROLE TYPE 1]

[2-3 sentence statement: what they are, strongest evidence, what they are aiming at.]

## [ROLE TYPE 2]

[2-3 sentence statement.]
```

Never edit the shared `05-cv-templates.md` during a reset — it holds no candidate data.

**For `<profile>/profile/writing-preferences.md`**, if it was present and included
in the confirmed inventory, clear its personal observations, leaving its headings
as an empty scaffold. Do not create this optional file during a reset.

**For `<profile>/profile/07-interview-prep.md`**, locate and remove:
- The entire `## Ready-Made STAR Examples` section and all numbered STAR examples under it
- Any `## STAR Candidates (Complete Manually)` section added by `/setup` Path A

Replace with:

```markdown
## Ready-Made STAR Examples

<!-- Run /setup to populate STAR examples from your actual experience -->
```

Leave all other content in `<profile>/profile/07-interview-prep.md` intact (STAR format explanation, tough questions, questions to ask interviewers, phone/video tips, follow-up etiquette, roleplay guidelines).

### Documents reset

For each non-empty document subfolder, delete all files within it using Bash `rm`. Do not delete the folder itself, and do not delete `<profile>/documents/README.md`.

```bash
rm -f <profile>/documents/cv/*
rm -f <profile>/documents/linkedin/*
rm -f <profile>/documents/diplomas/*
rm -f <profile>/documents/references/*
rm -rf <profile>/documents/applications/*/
```

---

## Step 4: Confirm What Was Done and Next Steps

After the reset is complete, report:

```
## Reset complete

### Cleared
[List each file/folder that was actually modified or cleared]

### Unchanged
[List anything that was already empty or was intentionally preserved]
```

Then tell the user what to do next based on what was reset:

**If profile was reset:**
> Your candidate profile is now blank. Run `/setup` to repopulate it. The command auto-detects any files in your `<profile>/documents/` folder and offers to read from there; otherwise it walks you through a CV import or interactive interview.

**If documents were reset:**
> The `<profile>/documents/` folder is now empty. Add your career documents and run `/setup` to populate your profile. See `<profile>/documents/README.md` for instructions on what to put where.

**If both were reset:**
> Both your profile files and documents folder are now empty. Add documents to `<profile>/documents/` (or skip and use the CV import / interview path), then run `/setup`.
