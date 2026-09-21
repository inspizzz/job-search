# /profile - Select or create a local job-search profile

Every job-search action uses exactly one local profile under `profiles/<slug>/`.
Real profiles are ignored by Git. `profiles/example/` is a tracked blank scaffold,
never an active person.

## Usage

- `/profile` — list local profiles and ask which person this session is for
- `/profile <slug>` — select that local profile and load it
- `/profile --list` — list local profiles without switching
- `/profile --new <slug>` — create a local profile from the blank scaffold

## List or select

1. Discover `profiles/*/PROFILE.md`, excluding `profiles/example/PROFILE.md`.
2. For listing, read only the manifests and present their display names/statuses.
   Do not write a roster into tracked files.
3. With no selection, ask which profile to use and offer Development. If none
   exist, explain how to create one with `/profile --new <slug>`.
4. Validate an explicit slug; do not silently create a missing profile or select
   a near match. Reject `example` as an active candidate.

## Load the selected profile

Read `PROFILE.md`, then `profile/00-summary.md`, `01-candidate-profile.md`, and
`02-behavioral-profile.md`. Load `04-job-evaluation.md` before scoring,
`03-cv-statements.md` and optional `writing-preferences.md` before drafting,
`07-interview-prep.md` before interview work, and `search-queries.md` before search.

Announce the display name and profile directory. Count tracker/seen entries if
present; missing local state starts empty. If the profile is still a scaffold,
suggest `/setup`. Selection is session-only; never persist a last-used pointer.

## Create a new local profile

1. Accept only lowercase letters, digits, and hyphens in the slug, beginning with
   a letter or digit. Reject `example`, path separators, and existing directories.
2. Copy only the blank `profiles/example/` scaffold to `profiles/<slug>/`.
   Never copy an existing person's directory.
3. Set the new manifest's slug, root path, and status (`Empty scaffold — run /setup`).
   Ask for a display name if needed, writing it only in the new local manifest.
4. Initialize `job_scraper/seen_jobs.json` to `{"seen": {}}` and the tracker with
   the header documented in `profiles/README.md`.
5. Verify that Git ignores the new directory before adding personal data.
   Never force-add it or add names to `CLAUDE.md`, `AGENTS.md`, or shared docs.
6. Select the new profile and suggest `/setup` to populate it.

## Rules

- Never mix candidate data between profiles.
- On a switch, reload the selected person's files and announce the switch.
- Development sessions need no profile.
- Keep the tracked example scaffold free of personal data.
