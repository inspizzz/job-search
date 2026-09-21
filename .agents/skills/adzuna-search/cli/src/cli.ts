#!/usr/bin/env bun
// Self-contained CLI for searching UK jobs via Adzuna's official Jobs API.
// Zero runtime dependencies — runs anywhere `bun` is available.
//
// Requires free Adzuna API credentials (app id + key) in the environment:
//   export ADZUNA_APP_ID=...   export ADZUNA_APP_KEY=...
// Get them at https://developer.adzuna.com/signup

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", d: "distance" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
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

const HELP = `adzuna-cli — search UK jobs via the Adzuna official API

SETUP (free API key)
  Sign up at https://developer.adzuna.com/signup, then:
    export ADZUNA_APP_ID=your_app_id
    export ADZUNA_APP_KEY=your_app_key

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords (title, skill, role). Recommended.
  --location, -l <text>   Where, e.g. "London", "Exeter", "United Kingdom". Optional.
  --jobage <days>         Posted within N days (max_days_old). Default: all.
  --distance, -d <km>     Radius in km around --location. Optional.
  --page <n>              1-indexed page. Default 1.
  --limit, -n <n>         Results per page / cap (max 50). Default 20.
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "AI engineer" -l "London" --jobage 14 --format table
  bun run src/cli.ts search -q "quantum" -l "United Kingdom" --format json
  bun run src/cli.ts search -q "machine learning" -l "Exeter" -d 40 --format table
  bun run src/cli.ts detail 5401234567 --format plain

Adzuna aggregates UK boards (Indeed, Reed, CV-Library, Totaljobs, employers). Sanctioned API —
respect the free-tier call limits.
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

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"

    for (const name of ["jobage", "page", "limit", "distance"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      distanceKm: flags.distance ? parseInt(flags.distance as string, 10) : undefined,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires an <id|url>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"] }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
