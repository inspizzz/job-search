#!/usr/bin/env bun
// Self-contained CLI for searching company job boards directly through their ATS
// public APIs (Greenhouse, Lever, Ashby). Keyless, zero runtime dependencies.
//
// Coverage is per-company, not market-wide: it returns every opening at the
// companies listed in companies.json the day it goes live. Pair it with a
// market-wide source (Adzuna, LinkedIn) rather than using it alone.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { runResolve, type ResolveOpts } from "./commands/resolve.js"
import { PROVIDERS, type Provider } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", c: "company", p: "provider" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `ats-search — search company job boards via their ATS public APIs

No API key required. Supported: greenhouse, lever, ashby.
Companies are listed in companies.json; add one with the "resolve" command.

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <url | provider:id | id --company <slug>> [--format json|plain]
  bun run src/cli.ts resolve <slug> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keyword filter on title + department. All terms must match.
  --location, -l <text>   Substring filter on the posting's location, e.g. "London", "UK".
  --company, -c <slugs>   Comma-separated company slugs instead of the whole registry.
  --provider, -p <name>   Restrict to one ATS: ${PROVIDERS.join(" | ")}.
  --tag <tag>             Only companies carrying this tag in companies.json (e.g. quantum).
  --jobage <days>         Posted/updated within N days. Default: all.
  --limit, -n <n>         Cap the number of results returned.
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "software engineer" -l UK --jobage 14 --format table
  bun run src/cli.ts search --tag quantum --format table
  bun run src/cli.ts search -c riverlane,psiquantum -q engineer --format plain
  bun run src/cli.ts resolve quantinuum --format plain
  bun run src/cli.ts detail https://job-boards.eu.greenhouse.io/riverlane/jobs/4784641101

NOTES
  --jobage filters on whichever timestamp the ATS exposes, and they are not the same
  thing: greenhouse = updated_at (last updated), lever = createdAt, ashby = publishedAt.
  Ashby and Lever boards are global — use --location to keep results UK-side.
`

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
    const val = parseInt(raw as string, 10)
    if (isNaN(val)) {
      process.stderr.write(
        JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n",
      )
      return null
    }
    return val
  }

  const readProvider = (): Provider | null | undefined => {
    if (flags.provider === undefined) return undefined
    const p = String(flags.provider)
    if (!PROVIDERS.includes(p as Provider)) {
      process.stderr.write(
        JSON.stringify({ error: `--provider must be one of ${PROVIDERS.join(", ")}, got "${p}"`, code: "BAD_ARG" }) + "\n",
      )
      return null
    }
    return p as Provider
  }

  if (cmd === "search") {
    for (const name of ["jobage", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name]!)
        if (v === null) return 1
        flags[name] = String(v)
      }
    }
    const provider = readProvider()
    if (provider === null) return 1

    const fmt = (flags.format as string) || "json"
    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      company: typeof flags.company === "string" ? flags.company : undefined,
      provider,
      tag: typeof flags.tag === "string" ? flags.tag : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires a <url|provider:id|id>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = {
      id,
      company: typeof flags.company === "string" ? flags.company : undefined,
      format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"],
    }
    return runDetail(opts)
  }

  if (cmd === "resolve") {
    const slug = (flags._ as string[])[1]
    if (!slug) {
      process.stderr.write(JSON.stringify({ error: "resolve requires a <slug>", code: "NO_SLUG" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: ResolveOpts = { slug, format: (fmt === "plain" ? "plain" : "json") as ResolveOpts["format"] }
    return runResolve(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
