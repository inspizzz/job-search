import {
  CATEGORIES,
  feedUrl,
  textFetch,
  parseItems,
  toCard,
  matchesQuery,
  matchesLocation,
  withinDays,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  category?: string // single category slug; default = all tech categories
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 40).padEnd(40)
    const company = (c.company || "—").slice(0, 22).padEnd(22)
    const loc = (c.location || "—").slice(0, 22).padEnd(22)
    const date = (c.date || "—").slice(0, 16)
    return `${c.id.slice(0, 30).padEnd(30)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(30) + " " + "TITLE".padEnd(40) + " " + "COMPANY".padEnd(22) + " " +
    "LOCATION".padEnd(22) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const categories = opts.category ? [opts.category] : Object.keys(CATEGORIES)

    // Fetch the chosen feeds in parallel, tolerating individual feed failures.
    const settled = await Promise.allSettled(
      categories.map(async (slug) => {
        const xml = await textFetch(feedUrl(slug))
        return parseItems(xml, CATEGORIES[slug]).map(toCard)
      }),
    )

    // Merge + dedupe by id (a job can appear in more than one category feed).
    const seen = new Set<string>()
    let all: JobCard[] = []
    for (const r of settled) {
      if (r.status !== "fulfilled") continue
      for (const card of r.value) {
        if (seen.has(card.id)) continue
        seen.add(card.id)
        all.push(card)
      }
    }

    const nowEpoch = Math.floor(new Date().getTime() / 1000)
    const filtered = all
      .filter(
        (c) =>
          matchesQuery(c, opts.query) &&
          matchesLocation(c, opts.location) &&
          withinDays(c, opts.jobage, nowEpoch),
      )
      // Newest first.
      .sort((a, b) => (b.epoch ?? 0) - (a.epoch ?? 0))

    const pageSize = 10
    const start = (opts.page - 1) * pageSize
    let cards = filtered.slice(start, start + pageSize)
    if (opts.limit && opts.limit > 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page, total: filtered.length }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
