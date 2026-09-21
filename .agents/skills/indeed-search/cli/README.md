# indeed-cli

Zero-npm-dependency `bun` CLI for searching jobs on [Indeed UK](https://uk.indeed.com)'s public
pages. Part of the job-search repo's portal-skill pattern (see `linkedin-search` for the canonical
example).

## ⚠️ Personal use only — best-effort

Indeed's ToS prohibits scraping and the site is behind Cloudflare. Keep volume low. Requests go
through the system **`curl`** binary (Cloudflare blocks `bun`'s `fetch` at the TLS level; `curl`
gets through at low volume). If challenged, the CLI exits with `CLOUDFLARE_CHALLENGE` — wait and
retry, or set `INDEED_COOKIE`. See `../SKILL.md` for the full warning.

## Setup

```bash
cd .agents/skills/indeed-search/cli
bun install   # dev types only; the CLI itself has zero runtime dependencies (needs system curl)
```

## Usage

```bash
bun run src/cli.ts search -q "AI engineer" -l "London" --jobage 14 --format table
bun run src/cli.ts detail <jobkey> --format plain
```

See `../SKILL.md` for the full flag reference and `../url-reference.md` for the parsing anchors.

## Development

```bash
bun run typecheck   # tsc --noEmit
bun run test        # flag validation + best-effort live search (tolerates CLOUDFLARE_CHALLENGE)
```

## Design

- **Zero npm runtime dependencies** — `bun` + system `curl` + regex/JSON parsing.
- Search parses the embedded `mosaic-provider-jobcards` JSON; detail parses `window._initialData`.
- Balanced-brace extractor anchored on the unique data assignment (not the bare provider name).
- Errors go to stderr as `{ "error", "code" }`, exit code 1; Cloudflare blocks → `CLOUDFLARE_CHALLENGE`.
