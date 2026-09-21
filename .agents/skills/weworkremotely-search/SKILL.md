---
name: weworkremotely-search
version: 1.0.0
description: >
  Search remote job listings from WeWorkRemotely's public RSS feeds — global, fully-remote roles
  in programming, full-stack, back-end, front-end, devops, and product. Use when the user wants
  remote/work-from-anywhere positions, or to supplement a UK search with remote-friendly openings.
  Trigger phrases: remote jobs, work from anywhere jobs, remote software jobs, remote developer jobs,
  weworkremotely, remote engineering roles.
context: fork
allowed-tools: Bash(bun run skills/weworkremotely-search/cli/src/cli.ts *)
---

# WeWorkRemotely Search Skill

Search live remote job listings from [WeWorkRemotely](https://weworkremotely.com)'s public
category RSS feeds. No authentication, no API key, **zero runtime dependencies** — runs with
just `bun`.

WeWorkRemotely is a **global, remote-only** board. There is no location parameter on the source
(every job is remote); `--location` is a client-side substring filter on each posting's stated
region (e.g. "Europe", "USA Only"). By default the CLI merges a set of tech-relevant category
feeds; use `--category` to target one. Treat this as a supplementary source alongside
`linkedin-search`, `indeed-search`, and `adzuna-search`.

## ⚠️ Personal use only

This uses WeWorkRemotely's public RSS feeds. Keep volume low and don't use it commercially or
for bulk data collection. Run it on your own responsibility.

## When to use this skill

- Find remote-friendly software/engineering openings (any country) to complement a UK search
- Filter remote roles by keyword, region, category, and recency

## Commands

### Search job listings

```bash
bun run skills/weworkremotely-search/cli/src/cli.ts search [flags]
```

Flags:
- `--query` / `-q <text>` — keywords matched against **title + company**. Recommended.
- `--location` / `-l <text>` — client-side substring filter on the posting's region. "remote"/"anywhere" match everything. Optional.
- `--jobage <days>` — posted within N days (e.g. `7`, `14`, `30`). Omit for all.
- `--category` / `-c <slug>` — search a single category feed instead of the default tech set. Slugs: `remote-programming-jobs`, `remote-full-stack-programming-jobs`, `remote-back-end-programming-jobs`, `remote-front-end-programming-jobs`, `remote-devops-sysadmin-jobs`, `remote-product-jobs`.
- `--page <n>` — 1-indexed, 10 results per page.
- `--limit` / `-n <n>` — cap total results emitted.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/weworkremotely-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the id from `search` results (the trailing path segment of the job URL). You may also
pass a full WeWorkRemotely job URL. The full description is served from the RSS feeds, so detail
only resolves jobs currently in the feeds.

## Usage examples

```bash
# Remote engineering roles, last 14 days
bun run skills/weworkremotely-search/cli/src/cli.ts search -q "engineer" --jobage 14 --format table

# Remote machine-learning roles
bun run skills/weworkremotely-search/cli/src/cli.ts search -q "machine learning" --format json

# Full-stack only
bun run skills/weworkremotely-search/cli/src/cli.ts search -q "developer" -c remote-full-stack-programming-jobs --format table

# Roles whose region names Europe
bun run skills/weworkremotely-search/cli/src/cli.ts search -q "backend" -l "Europe" --format table

# Full details for a specific job
bun run skills/weworkremotely-search/cli/src/cli.ts detail retr-senior-software-engineer --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing slugs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits 1.

## Notes

- Data is from WeWorkRemotely's public category RSS feeds — no credentials required.
- Titles are formatted `Company: Role`; the CLI splits them into `company` + `title`.
- Each feed holds only recent postings; the CLI merges + dedupes across the default tech set.
- Query matching is title+company only.
- WeWorkRemotely may rate-limit; the CLI retries 429/5xx with exponential backoff, and tolerates individual feed failures during a merge. Keep volume low.
