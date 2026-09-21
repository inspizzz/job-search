---
name: indeed-search
version: 1.0.0
description: >
  Search live job listings from Indeed UK (uk.indeed.com) — broad coverage across every sector and
  location in the UK, plus remote. Use when the user wants UK jobs by keyword and location. Trigger
  phrases: find a job, job search, search for jobs, job openings, vacancies, hiring, UK jobs,
  jobs in London, indeed, "are there any X jobs in <place>".
context: fork
allowed-tools: Bash(bun run skills/indeed-search/cli/src/cli.ts *)
---

# Indeed UK Search Skill

Search live job listings from [Indeed UK](https://uk.indeed.com)'s public search pages, and fetch
a single posting's full description. Zero npm dependencies — runs with `bun` and the system `curl`.

## ⚠️ Personal use only — best-effort

Indeed's Terms of Service prohibit automated access, and the site is protected by **Cloudflare**.
This skill is **personal-use only** and **best-effort**:

- Keep volume low — a handful of searches, never a crawl. Do not use commercially or for bulk collection.
- Requests are made with the system **`curl`** binary, not `bun`'s `fetch`: Cloudflare blocks `fetch` at
  the TLS-fingerprint level (403) regardless of headers, but allows `curl` through at low volume. `curl`
  must be installed (it is on virtually every system).
- If Cloudflare serves a challenge anyway, the CLI exits with `code: "CLOUDFLARE_CHALLENGE"`. Wait a
  few minutes and retry, or set the `INDEED_COOKIE` env var to a fresh `Cookie` header copied from your
  browser (note: a cookie from a real browser may still not validate, because Cloudflare binds it to the
  browser's TLS fingerprint — waiting and retrying is usually more reliable).

Run it on your own responsibility.

## Commands

### Search job listings

```bash
bun run skills/indeed-search/cli/src/cli.ts search [flags]
```

Flags:
- `--query` / `-q <text>` — keywords (title, skill, role). Recommended.
- `--location` / `-l <text>` — e.g. `"London"`, `"Exeter"`, `"Remote"`. Optional.
- `--jobage <days>` — posted within N days (Indeed effectively caps this at ~14). Omit for all.
- `--page <n>` — 1-indexed (~10–15 results per page).
- `--limit` / `-n <n>` — cap total results emitted.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/indeed-search/cli/src/cli.ts detail <jobkey|url> [--format json|plain]
```

`jobkey` is the 16-char hex id from `search` results (e.g. `c2cf705edb280cf1`). You may also pass a
full `viewjob?jk=…` URL. Returns the full description, job type, company, and location.

## Usage examples

```bash
# AI engineering roles in London, last 14 days
bun run skills/indeed-search/cli/src/cli.ts search -q "AI engineer" -l "London" --jobage 14 --format table

# Remote machine-learning roles
bun run skills/indeed-search/cli/src/cli.ts search -q "machine learning" -l "Remote" --format json

# Quantum roles anywhere in the UK
bun run skills/indeed-search/cli/src/cli.ts search -q "quantum" -l "United Kingdom" --format table

# Full details for a specific posting
bun run skills/indeed-search/cli/src/cli.ts detail c2cf705edb280cf1 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing jobkeys to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits 1.
The distinctive error code is `CLOUDFLARE_CHALLENGE` (see the warning above).

## Notes

- Data is parsed from the JSON embedded in Indeed's own pages (`mosaic-provider-jobcards` on the SERP,
  `window._initialData` on the viewjob page) — no official API, no credentials.
- `robots.txt` disallows `/viewjob` for scraper-class bots; `detail` is provided for personal, low-volume
  lookups only. Keep to a few requests.
- Each search page returns ~10–15 postings; use `--page` for more.
- Requires `curl` on PATH (see the transport note above).
