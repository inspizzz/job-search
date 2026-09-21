import {
  API_BASE,
  getCredentials,
  jsonFetch,
  toCard,
  MissingCredentialsError,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  distanceKm?: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function buildUrl(opts: SearchOpts): string {
  const { appId, appKey } = getCredentials()
  const page = Math.max(1, opts.page)
  const params = new URLSearchParams()
  params.set("app_id", appId)
  params.set("app_key", appKey)
  params.set("results_per_page", String(opts.limit && opts.limit > 0 ? Math.min(opts.limit, 50) : 20))
  params.set("content-type", "application/json")
  if (opts.query) params.set("what", opts.query)
  if (opts.location) params.set("where", opts.location)
  if (opts.jobage && opts.jobage > 0 && opts.jobage < 9999) params.set("max_days_old", String(opts.jobage))
  if (opts.distanceKm && opts.distanceKm > 0) params.set("distance", String(opts.distanceKm))
  params.set("sort_by", "date")
  return `${API_BASE}/${page}?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 38).padEnd(38)
    const company = (c.company || "—").slice(0, 22).padEnd(22)
    const loc = (c.location || "—").slice(0, 22).padEnd(22)
    const salary = (c.salary || "—").slice(0, 20).padEnd(20)
    const date = (c.date || "—").slice(0, 10)
    return `${c.id.slice(0, 12).padEnd(12)} ${title} ${company} ${loc} ${salary} ${date}`
  })
  const header =
    "ID".padEnd(12) + " " + "TITLE".padEnd(38) + " " + "COMPANY".padEnd(22) + " " +
    "LOCATION".padEnd(22) + " " + "SALARY".padEnd(20) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const data = await jsonFetch(buildUrl(opts))
    const results: any[] = Array.isArray(data?.results) ? data.results : []
    let cards = results.map(toCard)
    if (opts.limit && opts.limit > 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.salary || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page, total: data?.count ?? null }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    if (e instanceof MissingCredentialsError) {
      writeError(e.message, "MISSING_CREDENTIALS")
      return 1
    }
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
