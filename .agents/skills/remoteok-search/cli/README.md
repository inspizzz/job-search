# remoteok-cli

Zero-dependency `bun` CLI for searching remote jobs on [RemoteOK](https://remoteok.com)'s
public JSON feed. Part of the job-search repo's portal-skill pattern (see `linkedin-search`
for the canonical example).

## Setup

```bash
cd .agents/skills/remoteok-search/cli
bun install   # dev types only; the CLI itself has zero runtime dependencies
```

## Usage

```bash
bun run src/cli.ts search -q "engineer" --jobage 14 --format table
bun run src/cli.ts detail <id> --format plain
```

See `../SKILL.md` for the full flag reference and examples, and `../url-reference.md` for the
endpoint/field documentation.

## Development

```bash
bun run typecheck   # tsc --noEmit
bun run test        # live smoke tests + flag validation (needs network)
```

## Design

- **Zero runtime dependencies** — plain `bun` + `fetch` + JSON.
- One public endpoint (`/api`) returns the whole feed; all filtering is client-side.
- Query matches title+company only (RemoteOK tags are too generic to match on).
- Errors go to stderr as `{ "error", "code" }`, exit code 1.

Personal use only — keep request volume low.
