# Local candidate profiles

The repository ships `profiles/example/`, a blank, tracked scaffold. Real profiles
live under `profiles/<slug>/` and are ignored by Git in their entirety. That includes
identity/contact details, CV sources, behavioural profiles, preferences, documents,
search history, and trackers. There is no personal roster in the repository.

## Create a profile

In Claude Code, run `/profile --new my-profile`; in Codex, run
`$job-profile --new my-profile`. Choose your own slug instead of `my-profile`.
The command copies the blank scaffold, initializes local state, and selects the
new profile. Then run `/setup` or `$job-setup` for that person.

The manual equivalent is:

```bash
cp -R profiles/example profiles/my-profile
git check-ignore profiles/my-profile/PROFILE.md
```

Update the copied manifest's slug, display name, and root path locally. Never
populate `profiles/example/`, force-add a personal profile, or record names in
shared instructions. The assistants discover people from local manifests.

## Layout

```text
profiles/<slug>/
├── PROFILE.md
├── profile/
│   ├── 00-summary.md
│   ├── 01-candidate-profile.md
│   ├── 02-behavioral-profile.md
│   ├── 03-cv-statements.md
│   ├── writing-preferences.md       # optional personal observations
│   ├── 04-job-evaluation.md
│   ├── 07-interview-prep.md
│   └── search-queries.md
├── cv/
├── cover_letters/                   # cover.cls and OpenFonts/
├── documents/
├── job_scraper/seen_jobs.json
├── job_search_tracker.csv
└── upskill/
```

Each profile carries its own class and font assets so LaTeX can compile from its
document directory without reading another person's files.

## Tracker schema

Create a missing local `job_search_tracker.csv` with this header:

```csv
date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source
```

## Shared tooling

`.claude/` contains shared workflows and formatting rules. `.agents/skills/`
contains Codex adapters and portal CLIs. `templates/` contains only anonymized
templates. See `docs/CODEX.md` for Codex entry points.

Indeed and Adzuna are configured for the UK. LinkedIn and the remote boards serve
other markets. Use `/add-portal` or `$job-add-portal` for another local job board.

Application tools require an explicit profile slug and an ignored manifest.
Each local profile may also hold `reports/`, `application-forms/`, ranking state
and uniquely named application archives. See [application state](../docs/APPLICATION-STATE.md).
The blank scaffold includes a compileable example letter and `documents/projects/`.
