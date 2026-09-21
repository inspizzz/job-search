import {
  BlockedError,
  buildSearchUrl,
  htmlFetch,
  parseSearchPage,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  /** Client-side only — see note below. */
  location?: string
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

/**
 * jobs.ac.uk silently ignores a `location=` query parameter (verified: the same 25
 * results come back with and without it), so location has to be filtered here on the
 * parsed cards. Put the place name in --query instead if you want the site itself to
 * weight it.
 */
function matchesLocation(card: JobCard, location?: string): boolean {
  if (!location) return true
  return (card.location ?? "").toLowerCase().includes(location.toLowerCase())
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const header =
    "ID".padEnd(9) + " " + "TITLE".padEnd(44) + " " + "EMPLOYER".padEnd(28) + " " +
    "LOCATION".padEnd(18) + " PLACED"
  const rows = cards.map(
    (c) =>
      `${c.id.slice(0, 9).padEnd(9)} ${c.title.slice(0, 44).padEnd(44)} ` +
      `${(c.employer || "—").slice(0, 28).padEnd(28)} ${(c.location || "—").slice(0, 18).padEnd(18)} ${c.datePlaced || "—"}`,
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const url = buildSearchUrl(opts.query, opts.page)

    // jobs.ac.uk intermittently serves a 200 with no result cards when it is rate-limiting
    // (observed under repeated querying). That is transient, so retry before concluding
    // anything — a genuinely empty search says so in the page text.
    let html = await htmlFetch(url)
    let parsed = parseSearchPage(html)
    const looksGenuinelyEmpty = (h: string) => /no jobs|no results|0 jobs|did not match/i.test(h)

    for (let attempt = 1; attempt <= 2 && parsed.length === 0 && !looksGenuinelyEmpty(html); attempt++) {
      await new Promise((r) => setTimeout(r, 1200 * attempt + Math.floor(Math.random() * 400)))
      html = await htmlFetch(url)
      parsed = parseSearchPage(html)
    }

    // Still nothing after retries: either the site is throttling us hard or the markup
    // changed. Never report this as a confident "no jobs".
    if (parsed.length === 0 && !looksGenuinelyEmpty(html)) {
      writeError(
        "Fetched the page (HTTP 200) but parsed 0 result cards after 3 attempts. Either jobs.ac.uk " +
          "is rate-limiting this client, or its markup changed — check the card selectors in " +
          "helpers.ts (parseSearchPage). This is NOT a zero-result search.",
        "PARSE_EMPTY",
      )
      return 1
    }

    let cards = parsed.filter((c) => matchesLocation(c, opts.location))
    const total = cards.length
    if (opts.limit && opts.limit > 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.employer || "—"} · ${c.location || "—"} · ${c.salary || "—"}\n  placed ${c.datePlaced || "—"}, closes ${c.closes || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          {
            meta: {
              count: cards.length,
              total,
              page: opts.page,
              pageSizeFromSite: parsed.length,
              locationFilteredClientSide: Boolean(opts.location),
            },
            results: cards,
          },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    if (e instanceof BlockedError) {
      writeError(e.message, "BLOCKED")
      return 1
    }
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
