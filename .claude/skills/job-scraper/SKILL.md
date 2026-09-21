---
name: job-scraper
description: >
  Scrapes UK job sites (LinkedIn, Indeed, Adzuna, RemoteOK, WeWorkRemotely) plus WebSearch for new
  positions matching your profile. Deduplicates across runs.
  Triggers on: job scrape, find jobs, search jobs, new jobs, job search, scrape jobs, /scrape
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Agent, AskUserQuestion, Bash
---

> **Establish the active profile before Step 1.** This command operates on one person's data.
> If the user has not already named the person, ask with `AskUserQuestion` (available local profiles /
> Development) per the **Profile Routing** section of the root `CLAUDE.md`, then load
> `profiles/<slug>/PROFILE.md` and `profiles/<slug>/profile/00-summary.md` before proceeding.


# Job Scraper

---

## How It Works

This skill searches multiple UK job sites using targeted queries based on your profile, deduplicates against previously seen jobs and the application tracker, and presents new matches with a quick fit assessment.

It combines two channels:
- **Portal CLIs** (`.agents/skills/*-search`) — zero-dependency `bun` tools for LinkedIn, Indeed, Adzuna, company ATS boards, jobs.ac.uk, RemoteOK and WeWorkRemotely. Run these via Bash for structured, parseable results. Only Adzuna needs a key (free: `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`).

  Two behave differently from the rest and are worth using deliberately:
  - **`ats-search`** reads company job boards straight from their ATS (Greenhouse/Lever/Ashby). It is *per-company, not market-wide* — it covers only the companies in `.agents/skills/ats-search/cli/companies.json` — but returns their openings the day they publish, with no aggregator lag. Use it for the profile's named target companies; `resolve <slug>` adds a new one.
  - **`jobsacuk-search`** covers UK academic and research posts (postdocs, research software engineers, fellowships) that the general boards index poorly. Its `--location` filters client-side and it has no `--jobage`.
- **WebSearch** `site:` queries — for company career pages and any portal without a CLI.

## Invocation

The user triggers this skill by saying things like:
- "Find new jobs"
- "Scrape for jobs"
- "Any new positions?"
- "/scrape"

Optional arguments:
- A focus area, e.g. "/scrape data science" or "/scrape geophysics"
- "broad" to run all search categories, e.g. "/scrape broad"

---

## Execution Steps

### Step 0: Load State

1. Read `<profile>/job_scraper/seen_jobs.json` (create if missing - start with `{"seen": {}}`)
2. Read `<profile>/job_search_tracker.csv` to extract already-applied companies+roles
3. Read `<profile>/profile/search-queries.md` (this directory) for the search strategy

### Step 1: Search

Prefer the **portal CLIs** — they return structured JSON that is easy to dedupe and present. Run them via Bash from the repo root, e.g.:

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "AI engineer" -l "London, United Kingdom" --jobage 14 --format json
bun run .agents/skills/indeed-search/cli/src/cli.ts search -q "machine learning" -l "London" --jobage 14 --format json
bun run .agents/skills/adzuna-search/cli/src/cli.ts search -q "quantum" -l "London" --jobage 14 --format json   # needs ADZUNA_APP_ID/KEY
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "AI engineer" --format json
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q "machine learning" --format json
bun run .agents/skills/ats-search/cli/src/cli.ts search -q "engineer" -l "United Kingdom" --jobage 14 --format json
bun run .agents/skills/jobsacuk-search/cli/src/cli.ts search -q "quantum" --format json
```

Then supplement with **WebSearch** `site:` queries from `<profile>/profile/search-queries.md` for company career pages. By default, run the top 3 priority categories; if the user said "broad", run all categories. If the user specified a focus area (e.g. "quantum"), prioritize queries from that category.

For each search:
- Target your configured geographic area (London / South West / Remote UK)
- Look for postings from the last 14 days
- If a portal CLI errors (e.g. Indeed Cloudflare challenge, or missing Adzuna key), note it and fall back to WebSearch for that source
- `jobsacuk-search` exiting with `PARSE_EMPTY` means the site's markup changed, **not** that there are no jobs — report it as a broken scraper, never as a zero-result search
- `ats-search` reports a per-company 404 as a warning in `meta.errors` and keeps going; only flag it if every company failed

### Step 2: Fetch & Parse

For each promising result from Step 1:
- Use `WebFetch` to retrieve the job posting page
- Extract: **job title**, **company**, **location**, **posting date** (or "recent"), **URL**, **key requirements** (brief), **application deadline** (if listed)
- Skip if the URL or company+title combo already exists in `seen_jobs.json`
- Skip if the company+role already appears in `<profile>/job_search_tracker.csv`

### Step 3: Quick Fit Assessment

For each new job, do a rapid fit check (NOT the full evaluation from `<profile>/profile/04-job-evaluation.md` - just a quick signal):

- **High match**: Role directly involves your core skills
- **Medium match**: Role is adjacent to your experience
- **Low match**: Role requires significant skills you lack

### Step 4: Deduplicate & Store

1. Add ALL fetched jobs (new and skipped) to `seen_jobs.json` with structure:
```json
{
  "seen": {
    "<url_or_company_title_key>": {
      "title": "...",
      "company": "...",
      "url": "...",
      "first_seen": "YYYY-MM-DD",
      "fit": "high/medium/low",
      "status": "new/skipped/evaluated"
    }
  }
}
```
2. Only present jobs NOT already in the seen list or tracker.

### Step 5: Present Results

Present new jobs in a table sorted by fit (high first):

```
## New Job Matches - YYYY-MM-DD

Found X new positions (Y high, Z medium, W low match).

| # | Fit | Title | Company | Location | Deadline | URL |
|---|-----|-------|---------|----------|----------|-----|
| 1 | High | ... | ... | ... | ... | [Link](...) |

### High-Match Highlights
For each high-match job, add 2-3 bullet points:
- Why it matches your profile
- Key requirements to check
- Any red flags
```

After presenting, ask:
> "Want me to evaluate any of these in detail? Just give me the number(s)."

If the user picks a number, invoke the **job-application-assistant** skill workflow (fit evaluation first, then CV + cover letter if approved).

### Step 6: Update Tracker (Optional)

If the user decides to apply to any job, add a row to `<profile>/job_search_tracker.csv`.

---

## Important Rules

1. **Never fabricate job postings.** Only present jobs found via actual WebSearch/WebFetch results.
2. **Respect deduplication.** Always check seen_jobs.json AND <profile>/job_search_tracker.csv before presenting.
3. **Focus on configured geographic area.** Skip jobs that require relocation or are clearly outside commute range.
4. **Only open positions.** Skip postings with expired deadlines or those marked as closed.
5. **Be efficient with WebFetch.** Don't fetch every search result - use titles and snippets to pre-filter before fetching.
6. **Parallel searches.** Use the Agent tool or parallel WebSearch calls to speed up the search phase.
