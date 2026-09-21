---
name: remoteok-search
version: 1.0.0
description: >
  Search remote job listings from RemoteOK's public feed — global, fully-remote roles across
  software, data, design, marketing, and more. Use when the user wants remote/work-from-anywhere
  positions, or to supplement a UK search with remote-friendly openings. Trigger phrases:
  remote jobs, work from anywhere jobs, remote software jobs, find remote work, remote AI jobs,
  remote engineering roles.
context: fork
allowed-tools: Bash(bun run skills/remoteok-search/cli/src/cli.ts *)
---

# RemoteOK Search Skill

Search live remote job listings from [RemoteOK](https://remoteok.com)'s public JSON feed.
No authentication, no API key, **zero runtime dependencies** — runs with just `bun`.

RemoteOK is a **global, remote-only** board. There is no location parameter on the source
(every job is remote); `--location` is a client-side substring filter for when a posting names
a preferred region. The public feed is a snapshot of roughly the ~100 most recent postings, so
treat this as a supplementary source alongside `linkedin-search`, `indeed-search`, and
`adzuna-search`, not an exhaustive one.

## ⚠️ Personal use only

This uses RemoteOK's public feed. Keep volume low and don't use it commercially or for bulk
data collection. Run it on your own responsibility.

## When to use this skill

- Find remote-friendly openings (any country) to complement a UK/office search
- Filter remote roles by keyword and recency

## Commands

### Search job listings

```bash
bun run skills/remoteok-search/cli/src/cli.ts search [flags]
```

Flags:
- `--query` / `-q <text>` — keywords matched against **job title and company** (RemoteOK's tags are a generic soup, so they're deliberately excluded). Recommended.
- `--location` / `-l <text>` — client-side substring filter on the posting's stated location. "remote" matches everything. Optional.
- `--jobage <days>` — posted within N days (e.g. `7`, `14`, `30`). Omit for all.
- `--page <n>` — 1-indexed, 10 results per page.
- `--limit` / `-n <n>` — cap total results emitted.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/remoteok-search/cli/src/cli.ts detail <id|slug|url> [--format json|plain]
```

`id` is the numeric job id from `search` results. You may also pass a RemoteOK job URL or slug.
Detail is served from the same public feed, so it only resolves jobs currently in the feed.

## Usage examples

```bash
# Remote engineering roles, last 14 days, human-readable
bun run skills/remoteok-search/cli/src/cli.ts search -q "engineer" --jobage 14 --format table

# Remote machine-learning roles
bun run skills/remoteok-search/cli/src/cli.ts search -q "machine learning" --format json

# Backend roles that name Europe in the location
bun run skills/remoteok-search/cli/src/cli.ts search -q "backend" -l "Europe" --format table

# Full details for a specific job
bun run skills/remoteok-search/cli/src/cli.ts detail 1134578 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits 1.

## Notes

- Data is from RemoteOK's public `/api` feed — no credentials required.
- The feed's first element is a legal/metadata notice; the CLI skips it automatically.
- The feed holds only the most recent ~100 postings, so older jobs won't appear.
- Query matching is title+company only, by design (see the `--query` note above).
- RemoteOK may rate-limit; the CLI retries 429/5xx with exponential backoff. Keep volume low.
