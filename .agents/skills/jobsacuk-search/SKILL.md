---
name: jobsacuk-search
version: 1.0.0
description: >
  Search UK academic and research jobs on jobs.ac.uk — postdocs, research software engineers,
  fellowships, lab and university posts. Covers the research niche that general job boards
  index poorly. No API key. Trigger phrases: academic jobs, research jobs, postdoc, PDRA,
  research associate, university jobs, fellowship, jobs.ac.uk, research software engineer.
context: fork
allowed-tools: Bash(bun run skills/jobsacuk-search/cli/src/cli.ts *)
---

# jobs.ac.uk Search Skill

Search UK university, research-institute and academic-employer vacancies on
[jobs.ac.uk](https://www.jobs.ac.uk). Zero runtime dependencies — runs with `bun`, no key.

**Best for:** postdocs and PDRAs, research associates, research software engineers,
fellowships, and lab/technical posts at UK universities. These rarely surface on LinkedIn
or Indeed with useful metadata.

## Data source and etiquette

jobs.ac.uk publishes **no JSON API and no RSS** — the advertised `/feeds/` paths return 404
and the site emits no feed auto-discovery — so this is a best-effort HTML scrape of the
public search pages, plus the schema.org JSON-LD block on each advert page.

`robots.txt` (checked 2026-09-01) disallows only `/job/feedback/` and `/enhanced/fp/`;
`/search/` and `/job/` are both permitted. Keep searches purposeful anyway.

## Commands

### Search

```bash
bun run skills/jobsacuk-search/cli/src/cli.ts search [flags]
```

| Flag | Meaning |
|------|---------|
| `--query`, `-q` | Keywords, e.g. `quantum`, `"research software engineer"`. |
| `--location`, `-l` | Substring filter on location. **Client-side only** — see below. |
| `--page` | 1-indexed. 25 results per page. |
| `--limit`, `-n` | Cap results. |
| `--format` | `json` (default), `table`, `plain`. |

```bash
bun run skills/jobsacuk-search/cli/src/cli.ts search -q quantum --format table
bun run skills/jobsacuk-search/cli/src/cli.ts search -q "research software engineer" -l London --format plain
```

### Detail

```bash
bun run skills/jobsacuk-search/cli/src/cli.ts detail <url | reference-code> [--format json|plain]
```

Accepts a full advert URL or the bare reference code from a search result (e.g. `DSR541`).

## Gotchas

- **`--location` filters client-side.** jobs.ac.uk *silently ignores* a `location=` query
  parameter — the identical 25 results come back with and without it (verified). So `-l`
  filters the results of the page already fetched. To make the site itself weight a place,
  put it in `--query`, or page through with `--page`.
- **No `--jobage`.** Search cards print "Date Placed" as a day and month with no year
  (`21 Aug`), so an age filter could not be computed honestly. The site sorts most-recent
  first, so page 1 is the newest.
- **Dates differ between search and detail.** Search cards give `"21 Aug"`; the detail page
  carries JSON-LD and returns a real ISO-8601 `datePlaced`. Call `detail` if you need to
  compare or sort by date.
- **A zero-result parse is treated as a failure, not an answer.** jobs.ac.uk sometimes serves a
  200 with no result cards when it is throttling a client, so the CLI retries twice with backoff
  before giving up. If it still parses nothing it exits 1 with `PARSE_EMPTY`, meaning either the
  site is rate-limiting or the markup changed and `parseSearchPage` in `helpers.ts` needs
  updating. It will never silently report "no jobs".
- On `BLOCKED` (403/429), wait and retry or fall back to WebSearch with `site:jobs.ac.uk`.
