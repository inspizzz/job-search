# ats-search CLI

Search company job boards through their ATS public APIs (Greenhouse, Lever, Ashby).
Keyless, zero runtime dependencies.

```bash
bun install                       # dev deps only (typescript, @types/bun)
bun run src/cli.ts search -q engineer -l "United Kingdom" --format table
bun run src/cli.ts resolve <slug> --format plain     # add a company
bun run src/cli.ts detail <board-url> --format plain
bun test                          # live smoke tests against the real endpoints
bun run typecheck
```

Companies live in `companies.json`. See `../SKILL.md` for flags and gotchas,
`../url-reference.md` for the per-provider response shapes.
