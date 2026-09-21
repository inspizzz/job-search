# jobsacuk-search CLI

Search UK academic and research jobs on jobs.ac.uk. Zero runtime dependencies.

```bash
bun install                       # dev deps only (typescript, @types/bun)
bun run src/cli.ts search -q quantum --format table
bun run src/cli.ts detail DSR541 --format plain
bun test                          # live smoke tests against the site
bun run typecheck
```

See `../SKILL.md` for flags and gotchas, `../url-reference.md` for the endpoint and
markup contract this parser depends on.
