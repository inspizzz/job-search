# adzuna-cli

Zero-dependency `bun` CLI for searching UK jobs via [Adzuna](https://developer.adzuna.com)'s
official Jobs API. Part of the job-search repo's portal-skill pattern (see `linkedin-search`).

## Setup

```bash
cd .agents/skills/adzuna-search/cli
bun install   # dev types only; zero runtime dependencies

# Free API key: https://developer.adzuna.com/signup
export ADZUNA_APP_ID=your_app_id
export ADZUNA_APP_KEY=your_app_key
```

## Usage

```bash
bun run src/cli.ts search -q "AI engineer" -l "London" --jobage 14 --format table
bun run src/cli.ts detail <id> --format plain
```

See `../SKILL.md` for the full flag reference and `../url-reference.md` for the endpoint docs.

## Development

```bash
bun run typecheck   # tsc --noEmit
bun run test        # flag validation + (with creds) a live API smoke test; skips live test if unset
```

## Design

- **Zero npm runtime dependencies** — `bun` + `fetch` for the API; system `curl` for the optional
  details-page fetch in `detail`.
- Official, sanctioned API (not a scrape); aggregates Indeed/Reed/CV-Library/Totaljobs/employers.
- Missing creds → `MISSING_CREDENTIALS` with the signup link. Errors go to stderr as `{ error, code }`.
