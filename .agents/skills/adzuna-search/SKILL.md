---
name: adzuna-search
version: 1.0.0
description: >
  Search live UK job listings via Adzuna's official Jobs API — broad UK coverage aggregated from
  Indeed, Reed, CV-Library, Totaljobs, and employer sites. Use when the user wants UK jobs by keyword,
  location, and salary. Requires free Adzuna API credentials. Trigger phrases: find a job, job search,
  UK jobs, jobs in London, jobs near me, adzuna, vacancies, hiring, "X jobs in <UK place>".
context: fork
allowed-tools: Bash(bun run skills/adzuna-search/cli/src/cli.ts *)
---

# Adzuna UK Search Skill

Search live UK job listings via [Adzuna](https://www.adzuna.co.uk)'s **official Jobs API**. This is
a sanctioned API (not a scrape), and Adzuna aggregates listings from Indeed, Reed, CV-Library,
Totaljobs, and employer career sites — so one query gives broad UK coverage. Zero runtime
dependencies — runs with `bun`.

## 🔑 Setup — free API key required

1. Sign up (free) at **https://developer.adzuna.com/signup**.
2. Copy your **Application ID** and **Application Key** from the dashboard.
3. Put them in the repo-root `.env` (copy `.env.example`). **`bun` auto-loads it**, so running
   the CLI from the repo root needs no export:
   ```
   ADZUNA_APP_ID=your_app_id
   ADZUNA_APP_KEY=your_app_key
   ```
   `.env` is gitignored — never commit it. Alternatives: export both in your shell profile, or
   prefix a single command with `ADZUNA_APP_ID=… ADZUNA_APP_KEY=… bun run …`.

**Both values are required.** The API returns HTTP 400 with only a key, and `AUTH_FAIL` with a
wrong id. The App ID is the short value on the dashboard; the Key is 32 hex characters.

Without credentials the CLI exits with `code: "MISSING_CREDENTIALS"` and the signup link. The free
tier is rate-limited (a few hundred calls/day) — keep searches purposeful.

## Commands

### Job detail

```bash
bun run skills/adzuna-search/cli/src/cli.ts detail <id | adzuna-url> [--format json|plain]
```

Adzuna's API has no by-id endpoint, and `adzuna.co.uk` answers **403 to every non-browser
client**, so the details page cannot be scraped. It does index the numeric job id as a
searchable token, so `detail` queries the API with `what=<id>` and asserts an exact id match
on the result — never a near-miss from the keyword search.

**Descriptions are truncated to 500 characters** by Adzuna, with no endpoint returning the
full body. The response sets `descriptionTruncated: true` when the limit was hit; use the
`url` for the complete posting.

### Search job listings

```bash
bun run skills/adzuna-search/cli/src/cli.ts search [flags]
```

Flags:
- `--query` / `-q <text>` — keywords (`what`). Recommended.
- `--location` / `-l <text>` — where, e.g. `"London"`, `"Exeter"`, `"United Kingdom"` (`where`).
- `--jobage <days>` — posted within N days (`max_days_old`). Omit for all.
- `--distance` / `-d <km>` — radius around `--location` (`distance`).
- `--page <n>` — 1-indexed page.
- `--limit` / `-n <n>` — results per page / cap (max 50, default 20).
- `--format json|table|plain` — default `json`.

Results include **salary** and **contract type** (Adzuna normalises these across sources), plus a
snippet description inline.

### Fetch full job detail

```bash
bun run skills/adzuna-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

The Adzuna API is **search-complete** — search already returns salary, company, location, and a
snippet description. `detail` is a convenience that fetches the public Adzuna details page for a job
id (or a `redirect_url`) and reads its schema.org JobPosting for the full description. It needs the
system `curl`; if the page is unavailable it returns `DETAIL_UNAVAILABLE` with the URL to open.

## Usage examples

```bash
# AI engineering roles in London, last 14 days, with salaries
bun run skills/adzuna-search/cli/src/cli.ts search -q "AI engineer" -l "London" --jobage 14 --format table

# Quantum roles anywhere in the UK
bun run skills/adzuna-search/cli/src/cli.ts search -q "quantum" -l "United Kingdom" --format json

# Machine-learning roles within 40 km of Exeter
bun run skills/adzuna-search/cli/src/cli.ts search -q "machine learning" -l "Exeter" -d 40 --format table

# Full details for a specific posting
bun run skills/adzuna-search/cli/src/cli.ts detail 5401234567 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use |
| `table` | Quick human-readable scanning (includes salary) |
| `plain` | Reading a job's fields / detail |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits 1.
Distinctive codes: `MISSING_CREDENTIALS`, `DETAIL_UNAVAILABLE`.

## Notes

- Country is fixed to `gb` (United Kingdom) — see `COUNTRY` in `helpers.ts` to change markets.
- Results are sorted by date (newest first).
- The API `description` is a snippet; `detail` fetches the fuller public-page description.
- Sanctioned API — respect the free-tier call limits.
