# Local application state

All state is under an explicitly selected, ignored `profiles/<slug>/`. Stateful
tools reject `example`, unknown profiles, tracked profiles, symlinks and paths
outside the selected profile. Run them from the repository root with Python 3.10+.
Use one writer per profile at a time.

## Tracker and archives

`tools/application_state.py --profile <slug> list` returns numbered tracker rows.
The CSV retains existing and unknown columns and reads UTF-8 with or without BOM.
Legacy rows without deadlines/archives remain readable. Invalid CSV is reported
instead of being silently rewritten. Fields containing commas/newlines are CSV-quoted.

Prepare a JSON object under `<profile>/application-draft.json` after verifying
the application. Required fields: string `company`, `role`. Optional strings:
`sector`, `role_type`, `channel`, `contact_person`, `fit_rating` (0–100), `notes`,
`cv_file`, `cover_letter_file`, `source`, `deadline` (YYYY-MM-DD), `posting_text`.
Document paths are relative to the profile, such as `cv/main_acme.pdf`.

```bash
python3 tools/application_state.py --profile <slug> draft --data application-draft.json
python3 tools/application_state.py --profile <slug> outcome --row 1 --status applied --note "Submission confirmed by candidate"
python3 tools/application_state.py --profile <slug> report
```

Drafting updates a matching draft or appends a new attempt after a final outcome.
It never overwrites a submitted application. Multiple open matches are an error
requiring explicit selection. The `archive` column identifies a distinct folder
for each attempt; it never relies on the company/role alone. Draft posting text
is replaceable; submitted snapshots are not. Missing documents are reported.

Outcome updates preserve other rows and unknown columns, append dated history to
the archive, and snapshot available submitted materials. No command sends anything.
The report is `<profile>/reports/application-dashboard.html`, entirely offline.

## Ranked jobs

`tools/job_key.py --company "Acme" --title "Engineer" --url "https://example.com/job"`
returns a stable key. Check both canonical key and existing URLs/company+title
before adding a posting, so legacy keys cannot cause duplicates. Audit an existing
file with `--audit <explicit-path>`; the audit never modifies it.

`tools/rank_state.py candidates --profile <slug>` reads
`job_scraper/seen_jobs.json` inside that profile. It selects ten new, untracked jobs
by default, with `--limit`, `--focus` and `--all` options. `apply` requires a results
JSON file inside that same profile. A bad result rejects the entire batch without
writing; `--dry-run` previews valid changes. `sweep --write` expires only jobs
whose stored ISO deadline has passed. Retrieval failure alone never expires a job.

Scoring weights remain technical 30%, experience 25%, behavioral 15%, career 30%.
Location, language and eligibility verdicts are separate shortlist gates.
