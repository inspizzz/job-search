// Data source: RemoteOK public JSON feed at https://remoteok.com/api.
// No authentication required. The feed is a single JSON array whose first
// element is a legal/metadata notice (skip it); the rest are job objects.
// We fetch the whole feed once and filter client-side, because RemoteOK does
// not expose a server-side keyword/location search on the public endpoint.

export const API_URL = "https://remoteok.com/api"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. */
export async function jsonFetch(url: string): Promise<unknown> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  tags?: string[]
  salary?: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  applyUrl: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&nbsp;/g, " ")
}

/** Strip HTML tags but keep paragraph/line breaks as newlines. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

interface RawJob {
  id?: string | number
  slug?: string
  company?: string
  position?: string
  location?: string
  date?: string
  epoch?: number
  url?: string
  apply_url?: string
  tags?: string[]
  description?: string
  salary_min?: number
  salary_max?: number
}

/** True for the leading legal/metadata element, which has no `position`. */
function isJob(o: unknown): o is RawJob {
  return typeof o === "object" && o !== null && "position" in (o as object)
}

function salaryText(j: RawJob): string | null {
  if (j.salary_min || j.salary_max) {
    const min = j.salary_min ? `$${j.salary_min.toLocaleString()}` : ""
    const max = j.salary_max ? `$${j.salary_max.toLocaleString()}` : ""
    return [min, max].filter(Boolean).join(" – ") || null
  }
  return null
}

export function toCard(j: RawJob): JobCard {
  return {
    id: String(j.id ?? j.slug ?? ""),
    title: j.position ?? "(untitled)",
    company: j.company ?? null,
    location: j.location || "Remote",
    date: j.date ?? null,
    url: (j.url ?? j.apply_url ?? "").replace("remoteOK.com", "remoteok.com"),
    tags: j.tags ?? [],
    salary: salaryText(j),
  }
}

export function toDetail(j: RawJob): JobDetail {
  return {
    ...toCard(j),
    description: j.description ? htmlToText(j.description) : null,
    applyUrl: (j.apply_url ?? j.url ?? "").replace("remoteOK.com", "remoteok.com") || null,
  }
}

/** Parse the raw feed into job objects, dropping the legal notice. */
export function parseFeed(raw: unknown): RawJob[] {
  if (!Array.isArray(raw)) throw new Error("Unexpected feed shape (not an array)")
  return raw.filter(isJob)
}

/**
 * Case-insensitive query match over the job title and company only. RemoteOK's
 * `tags` array is a generic soup (a single posting can carry 40+ tags including
 * "engineer", "dev", "designer"), and matching the description is far too loose,
 * so both would wreck relevance. The title is the one clean signal.
 * Each whitespace-separated term must appear (AND semantics).
 */
export function matchesQuery(j: RawJob, query: string | undefined): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const hay = [j.position, j.company].join(" ").toLowerCase()
  return q.split(/\s+/).every((term) => hay.includes(term))
}

/** Case-insensitive substring match on the location field. */
export function matchesLocation(j: RawJob, location: string | undefined): boolean {
  if (!location) return true
  const loc = (j.location ?? "").toLowerCase()
  // "remote" always matches — the whole board is remote.
  if (/remote/i.test(location)) return true
  return loc.includes(location.toLowerCase())
}

/** Keep jobs posted within `days` (uses the epoch field). Returns true if no filter. */
export function withinDays(j: RawJob, days: number | undefined, nowEpoch: number): boolean {
  if (!days || days <= 0 || days >= 9999) return true
  if (!j.epoch) return true // unknown date — keep, don't silently drop
  return nowEpoch - j.epoch <= days * 86400
}
