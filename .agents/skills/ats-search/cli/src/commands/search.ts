import {
  extractPostings,
  jsonFetch,
  loadRegistry,
  PROVIDERS,
  searchUrl,
  toCard,
  writeError,
  type Company,
  type JobCard,
  type Provider,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  company?: string
  provider?: Provider
  tag?: string
  jobage: number
  limit?: number
  format: "json" | "table" | "plain"
}

/** Which companies this run should sweep. An explicit --company wins over the registry. */
function selectCompanies(opts: SearchOpts): Company[] {
  if (opts.company) {
    const registry = loadRegistry()
    const slugs = opts.company.split(",").map((s) => s.trim()).filter(Boolean)
    return slugs.map((slug) => {
      const known = registry.find((c) => c.slug === slug)
      if (known) return known
      if (!opts.provider) {
        throw new Error(
          `"${slug}" is not in companies.json — pass --provider greenhouse|lever|ashby, ` +
            `or run "resolve ${slug}" to detect it and add it to the registry.`,
        )
      }
      return { name: slug, slug, provider: opts.provider }
    })
  }
  let companies = loadRegistry()
  if (opts.provider) companies = companies.filter((c) => c.provider === opts.provider)
  if (opts.tag) {
    const tag = opts.tag.toLowerCase()
    companies = companies.filter((c) => (c.tags ?? []).some((t) => t.toLowerCase() === tag))
  }
  return companies
}

function matchesQuery(card: JobCard, query?: string): boolean {
  if (!query) return true
  const haystack = `${card.title} ${card.department ?? ""}`.toLowerCase()
  // All whitespace-separated terms must appear somewhere in title/department.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

function matchesLocation(card: JobCard, location?: string): boolean {
  if (!location) return true
  return (card.location ?? "").toLowerCase().includes(location.toLowerCase())
}

function withinAge(card: JobCard, days: number): boolean {
  if (!days || days >= 9999) return true
  if (!card.date) return true // undated postings are kept, not silently dropped
  const ageMs = Date.now() - new Date(card.date).getTime()
  return ageMs <= days * 24 * 60 * 60 * 1000
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  // Only Ashby publishes pay, and only when the employer opted in — so the column is
  // shown only when at least one result actually has it, rather than a dead column of
  // dashes on every UK sweep.
  const anySalary = cards.some((c) => c.salary)
  const header =
    "COMPANY".padEnd(18) + " " + "TITLE".padEnd(42) + " " +
    "LOCATION".padEnd(24) + " " + "ATS".padEnd(11) + " DATE" +
    (anySalary ? "        SALARY" : "")
  const rows = cards.map((c) => {
    const base =
      `${c.company.slice(0, 18).padEnd(18)} ${c.title.slice(0, 42).padEnd(42)} ` +
      `${(c.location || "—").slice(0, 24).padEnd(24)} ${c.provider.padEnd(11)} ${(c.date || "—").slice(0, 10)}`
    return anySalary ? `${base}  ${(c.salary || "—").slice(0, 30)}` : base
  })
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  let companies: Company[]
  try {
    companies = selectCompanies(opts)
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "BAD_COMPANY")
    return 1
  }
  if (companies.length === 0) {
    writeError("No companies matched the filters. Check --provider/--tag or companies.json.", "NO_COMPANIES")
    return 1
  }

  const errors: { company: string; error: string }[] = []
  const settled = await Promise.all(
    companies.map(async (c) => {
      try {
        const data = await jsonFetch(searchUrl(c.provider, c.slug))
        if (data === null) {
          errors.push({ company: c.slug, error: `unknown ${c.provider} slug (HTTP 404)` })
          return []
        }
        return extractPostings(data, c.provider)
          .map((raw) => toCard(raw, c.provider, c.name))
          .filter((card): card is JobCard => card !== null)
      } catch (e) {
        errors.push({ company: c.slug, error: e instanceof Error ? e.message : String(e) })
        return []
      }
    }),
  )

  let cards = settled.flat()
    .filter((c) => matchesQuery(c, opts.query))
    .filter((c) => matchesLocation(c, opts.location))
    .filter((c) => withinAge(c, opts.jobage))

  // Newest first; undated postings sink to the bottom rather than sorting as epoch 0.
  cards.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })

  const total = cards.length
  if (opts.limit && opts.limit > 0) cards = cards.slice(0, opts.limit)

  if (opts.format === "table") {
    process.stdout.write(renderTable(cards) + "\n")
    if (errors.length) {
      process.stderr.write(errors.map((e) => `warning: ${e.company}: ${e.error}`).join("\n") + "\n")
    }
  } else if (opts.format === "plain") {
    process.stdout.write(
      cards
        .map(
          (c) =>
            `${c.title}\n  ${c.company} · ${c.location || "—"} · ${c.department || "—"} · ${(c.date || "—").slice(0, 10)}` +
            (c.salary ? `\n  pay: ${c.salary}` : "") +
            `\n  ${c.provider}:${c.id}\n  ${c.url}`,
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
            companiesQueried: companies.length,
            withSalary: cards.filter((c) => c.salary).length,
            providers: [...new Set(companies.map((c) => c.provider))].sort(),
            errors,
          },
          results: cards,
        },
        null,
        2,
      ) + "\n",
    )
  }

  // Every company failing is a real failure; a partial sweep still returns its results.
  if (errors.length === companies.length) return 1
  return 0
}

export { PROVIDERS }
