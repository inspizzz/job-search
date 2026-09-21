#!/usr/bin/env bun
// Self-contained CLI for searching UK academic and research jobs on jobs.ac.uk.
// Zero runtime dependencies — runs anywhere `bun` is available.
//
// jobs.ac.uk publishes no JSON API and no RSS, so this scrapes the public search
// pages. Best-effort: if the site's markup changes, the parser needs updating and
// the CLI says so explicitly rather than reporting an empty result set.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
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

const HELP = `jobsacuk-search — search UK academic and research jobs on jobs.ac.uk

No API key required. Covers UK universities, research institutes and academic
employers: postdocs, research software engineers, lab posts, fellowships.

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <url | reference-code> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords, e.g. "quantum", "research software engineer".
  --location, -l <text>   Substring filter on the result's location. CLIENT-SIDE ONLY:
                          jobs.ac.uk ignores a location parameter, so this filters the
                          25 results of the requested page. Put the place in --query
                          if you want the site to weight it.
  --page <n>              1-indexed page. 25 results per page. Default 1.
  --limit, -n <n>         Cap the number of results returned.
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q quantum --format table
  bun run src/cli.ts search -q "research software engineer" -l London --format plain
  bun run src/cli.ts search -q "machine learning" --page 2 -n 10 --format table
  bun run src/cli.ts detail DSR541 --format plain

NOTES
  --jobage is not supported: jobs.ac.uk prints "Date Placed" as a day and month with no
  year, so an age filter could not be computed honestly. Results are sorted most-recent
  first by the site; use --page 1 for the newest postings.
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
    for (const name of ["page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name]!)
        if (v === null) return 1
        flags[name] = String(v)
      }
    }
    const fmt = (flags.format as string) || "json"
    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires a <url|reference-code>", code: "NO_ID" }) + "\n")
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
