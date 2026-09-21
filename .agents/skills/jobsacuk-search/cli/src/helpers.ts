// Data source: the public jobs.ac.uk search pages (https://www.jobs.ac.uk/search/).
// jobs.ac.uk publishes no JSON API and no RSS — the advertised /feeds/ paths return
// 404 and the site emits no feed auto-discovery links — so this is an HTML scrape of
// the same pages a browser renders. Best-effort by nature: markup changes break it.
//
// robots.txt (checked 2026-09-01) disallows only /job/feedback/ and /enhanced/fp/;
// /search/ and /job/ are both permitted. Keep requests purposeful anyway.
//
// Coverage: UK universities, research institutes and academic employers — postdocs,
// research software engineers, lab and fellowship posts. This is the niche that the
// general job boards index poorly.

export const BASE_URL = "https://www.jobs.ac.uk"
export const SEARCH_URL = `${BASE_URL}/search/`

/** jobs.ac.uk renders 25 results per page and paginates on a 1-indexed startIndex. */
export const PAGE_SIZE = 25

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export class BlockedError extends Error {
  constructor(status: number) {
    super(
      `jobs.ac.uk returned HTTP ${status}. The site may be rate-limiting or presenting a ` +
        `challenge page. Wait and retry, or fall back to WebSearch with "site:jobs.ac.uk".`,
    )
    this.name = "BlockedError"
  }
}

/** Fetch HTML with exponential backoff on 429/5xx. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 4
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new BlockedError(response.status)
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 403) throw new BlockedError(403)
    if (!response.ok) throw new Error(`jobs.ac.uk request failed: ${response.status} ${response.statusText}`)
    return response.text()
  }
  throw new BlockedError(429)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&pound;/g, "£")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)))
    .replace(/&amp;/g, "&")
}

export function stripTags(html: string): string {
  let s = decodeEntities(html)
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
  return decodeEntities(s)
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Collapse whitespace in a short text field (title, employer, location). */
function clean(s: string | undefined | null): string | null {
  if (s == null) return null
  const out = decodeEntities(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return out.length ? out : null
}

export interface JobCard {
  id: string
  title: string
  employer: string | null
  department: string | null
  location: string | null
  salary: string | null
  /** As printed on the card, e.g. "21 Aug" — jobs.ac.uk does not publish a year here. */
  datePlaced: string | null
  closes: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
}

export function buildSearchUrl(query: string | undefined, page: number): string {
  const params = new URLSearchParams()
  if (query) params.set("keywords", query)
  params.set("pageSize", String(PAGE_SIZE))
  // startIndex is 1-based and counts adverts, not pages.
  params.set("startIndex", String((Math.max(1, page) - 1) * PAGE_SIZE + 1))
  params.set("sortOrder", "1") // 1 = most recent first
  return `${SEARCH_URL}?${params.toString()}`
}

/**
 * Parse the result cards out of a search page.
 * Card shape (verified against live markup, 2026-09-01):
 *   <div class="j-search-result__result" data-advert-id="1085716">
 *     <a href="/job/DSR541/slug">Title</a>
 *     <div class="j-search-result__department">Department of Physics</div>
 *     <div class="j-search-result__employer"><b>University of Strathclyde</b></div>
 *     <div>Location: Glasgow</div>
 *     <div class="j-search-result__info"><strong>Salary: </strong>£37,694 to £46,049</div>
 *     <div><strong>Date Placed: </strong>21 Aug</div>
 *     <span class="...j-search-result__date--blue">21 Oct</span>   <- closing date
 */
export function parseSearchPage(html: string): JobCard[] {
  const cards: JobCard[] = []
  const blocks = html.split(/<div class="j-search-result__result[^"]*"/).slice(1)

  for (const block of blocks) {
    const idMatch = block.match(/data-advert-id="(\d+)"/)
    const linkMatch = block.match(/<a href="(\/job\/([A-Z0-9]+)\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/)
    if (!linkMatch) continue

    const href = linkMatch[1]!
    const jobRef = linkMatch[2]!
    const title = clean(linkMatch[3])
    if (!title) continue

    cards.push({
      // The advert id is the stable numeric key; the /job/<REF>/ code is what URLs use.
      id: idMatch?.[1] ?? jobRef,
      title,
      employer: clean(block.match(/j-search-result__employer[^>]*>\s*<b>([\s\S]*?)<\/b>/)?.[1]),
      department: clean(block.match(/j-search-result__department[^>]*>([\s\S]*?)<\/div>/)?.[1]),
      location: clean(block.match(/<div>\s*Location:\s*([\s\S]*?)<\/div>/)?.[1]),
      salary: clean(block.match(/<strong>\s*Salary:\s*<\/strong>([\s\S]*?)<\/div>/)?.[1]),
      datePlaced: clean(block.match(/<strong>\s*Date Placed:\s*<\/strong>([\s\S]*?)<\/div>/)?.[1]),
      closes: clean(block.match(/j-search-result__date--blue[^>]*>([\s\S]*?)<\/span>/)?.[1]),
      url: `${BASE_URL}${href}`,
    })
  }
  return cards
}

/**
 * Extract a posting from a /job/<REF>/<slug> page.
 *
 * jobs.ac.uk embeds a schema.org JobPosting block as JSON-LD on every advert page,
 * which carries the title, full description, ISO dates, employer, location and salary
 * as structured data. That is far more stable than scraping the rendered markup, so it
 * is the primary source here; the visible <th>Label:</th><td>Value</td> details table
 * is used only to fill gaps (department, contract hours).
 *
 * Note the detail page gives a real ISO `datePosted`, which the search cards do not —
 * they print only a day and month ("21 Aug").
 */
function findJsonLdJobPosting(html: string): any | null {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]!)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const c of candidates) {
        if (c && c["@type"] === "JobPosting") return c
      }
    } catch {
      // A malformed block is not fatal — keep looking for a valid one.
    }
  }
  return null
}

/** Read one row out of the advert's details table: <th>Label:</th><td>Value</td>. */
function tableField(html: string, label: string): string | null {
  const m = html.match(new RegExp(`<th[^>]*>\\s*${label}:?\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i"))
  return m ? clean(m[1]) : null
}

function salaryFromJsonLd(node: any): string | null {
  const v = node?.baseSalary?.value
  if (!v) return null
  const cur = node?.baseSalary?.currency === "GBP" ? "£" : `${node?.baseSalary?.currency ?? ""} `
  const unit = typeof v.unitText === "string" ? v.unitText.toLowerCase() : null
  const fmt = (n: unknown) => {
    const num = Number(n)
    return isNaN(num) ? null : `${cur}${Math.round(num).toLocaleString("en-GB")}`
  }
  const min = fmt(v.minValue)
  const max = fmt(v.maxValue)
  const range = min && max && min !== max ? `${min} to ${max}` : (min ?? max ?? fmt(v.value))
  if (!range) return null
  return unit && unit !== "year" ? `${range} per ${unit}` : range
}

function locationFromJsonLd(node: any): string | null {
  const places = Array.isArray(node?.jobLocation) ? node.jobLocation : node?.jobLocation ? [node.jobLocation] : []
  const parts = places
    .map((p: any) => {
      const a = p?.address ?? {}
      return [a.addressLocality, a.addressRegion].filter(Boolean).join(", ")
    })
    .filter((s: string) => s.length > 0)
  return parts.length ? [...new Set(parts)].join(" / ") : null
}

export function parseDetailPage(html: string, url: string): JobDetail | null {
  const refMatch = url.match(/\/job\/([A-Z0-9]+)\//i)
  const ld = findJsonLdJobPosting(html)

  const title = clean(ld?.title) ?? clean(html.match(/j-advert__title[^>]*>([\s\S]*?)<\/(?:div|h1)>/)?.[1]) ?? clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1])
  if (!title) return null

  return {
    id: refMatch?.[1]?.toUpperCase() ?? url,
    title,
    employer: clean(ld?.hiringOrganization?.name) ?? clean(html.match(/j-advert__employer[^>]*>([\s\S]*?)<\/div>/)?.[1]),
    department: tableField(html, "Department"),
    location: locationFromJsonLd(ld) ?? tableField(html, "Location"),
    salary: salaryFromJsonLd(ld) ?? tableField(html, "Salary"),
    // ISO from JSON-LD where available, else the table's "21st August 2026".
    datePlaced: typeof ld?.datePosted === "string" ? ld.datePosted : tableField(html, "Placed On"),
    closes: typeof ld?.validThrough === "string" ? ld.validThrough : tableField(html, "Closes"),
    url,
    description: typeof ld?.description === "string" ? stripTags(ld.description) : null,
  }
}
