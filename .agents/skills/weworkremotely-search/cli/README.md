# weworkremotely-cli

Zero-dependency `bun` CLI for searching remote jobs on [WeWorkRemotely](https://weworkremotely.com)'s
public category RSS feeds. Part of the job-search repo's portal-skill pattern (see `linkedin-search`
for the canonical example).

## Setup

```bash
cd .agents/skills/weworkremotely-search/cli
bun install   # dev types only; the CLI itself has zero runtime dependencies
```

## Usage

```bash
bun run src/cli.ts search -q "engineer" --jobage 14 --format table
bun run src/cli.ts detail <slug> --format plain
```

See `../SKILL.md` for the full flag reference and examples, and `../url-reference.md` for the
feed/field documentation.

## Development

```bash
bun run typecheck   # tsc --noEmit
bun run test        # live smoke tests + flag validation (needs network)
```

## Design

- **Zero runtime dependencies** — plain `bun` + `fetch` + regex RSS parsing.
- Merges a set of tech category feeds and dedupes by slug; `--category` targets one.
- Query matches title+company only; region is a client-side substring filter.
- Errors go to stderr as `{ "error", "code" }`, exit code 1.

Personal use only — keep request volume low.
