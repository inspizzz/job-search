# Rank scraped jobs

Establish the active profile using `CLAUDE.md`; load its profile references and
evaluation framework. This is triage from posting text, not the final researched
fit evaluation in `/apply`. All commands run from the repository root. Replace
`<slug>` with the selected slug and `<profile>` with `profiles/<slug>`.

Arguments: optional focus text, `--limit N` (default 10), `--top N` (default 5),
or `--all` to reconsider previously ranked/expired entries. A limit of 0 explicitly
requests the entire backlog. Never interpret an omitted limit as unlimited.

1. Select candidates without loading the entire backlog into context:
   ```bash
   python3 tools/rank_state.py candidates --profile <slug> --limit 10
   ```
   Add `--focus "text"` or `--all` when requested. Report selected/deferred counts.
   Entries already in the tracker are excluded regardless of their status.
2. Fetch each posting using its portal's `detail` CLI when supported, then native
   web tools. Follow `../skills/job-application-assistant/09-web-research.md`.
   Score only retrieved posting content. A timeout, 403, consent wall or parser
   error is `retrieval_failed`, not proof the vacancy expired. Mark `expired`
   only for an explicit closed banner, a passed stated deadline, or a confirmed
   removed posting after checking the employer's official source.
3. Apply `../skills/job-application-assistant/10-eligibility.md` and the active
   profile's fit rubric. Use the documented weights: technical 30%, experience
   25%, behavioral 15%, career 30%; location is a separate veto, not a number.
   Explain strengths and gaps using the posting and documented candidate facts.
4. Save a JSON array to `<profile>/job_scraper/rank-results.json`. Each scored
   result has `key`, `status: "scored"`, `scores` with all four numeric dimensions
   from 0 to 100, `location_verdict`, `language_gate`, `eligibility_gate`
   (`PASS`/`FAIL`/`FLAG`), optional supporting `language_note`/`eligibility_note`,
   `deadline` (ISO date or null), and `strengths`/`gaps` arrays. For retrieval
   failure/expiry, supply `key` and the corresponding status without inventing
   scores. Keep the result file inside the selected profile.
5. Preview and apply:
   ```bash
   python3 tools/rank_state.py apply --profile <slug> --results job_scraper/rank-results.json --dry-run
   python3 tools/rank_state.py apply --profile <slug> --results job_scraper/rank-results.json
   ```
   Any validation error prevents the whole batch from being written. Correct
   the reported data and retry; never reconstruct the entire seen-state file.
   Omitted deadlines do not erase stored deadlines. A retrieval failure leaves
   the job eligible for a later retry.
6. Check existing deadlines with `python3 tools/rank_state.py sweep --profile
   <slug>`; add `--write` to persist only expiry proved by those stored dates.
   Present the top requested results with URL, score, strengths/gaps, gate
   flags and deadline urgency (within seven days). List vetoes and failed
   retrievals separately. Offer `/apply` for a selected result; it re-evaluates
   fit and does company research before drafting.

The CLI writes state; only one writer should update a given profile at a time.
Do not re-key existing state automatically: `tools/job_key.py --audit
"<profile>/job_scraper/seen_jobs.json"` reports legacy keys without changing them.
