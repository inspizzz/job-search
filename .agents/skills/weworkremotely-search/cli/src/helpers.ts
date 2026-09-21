// Data source: WeWorkRemotely public category RSS feeds, e.g.
//   https://weworkremotely.com/categories/remote-programming-jobs.rss
// No authentication required. Each feed is an RSS document of <item> job cards.
// There is no server-side keyword search, so we fetch a set of category feeds,
// merge + dedupe them, and filter client-side.

export const FEED_BASE = "https://weworkremotely.com/categories"

/** Category slug -> human label. The default search set for a software/AI candidate. */
export const CATEGORIES: Record<string, string> = {
  "remote-programming-jobs": "Programming",
  "remote-full-stack-programming-jobs": "Full-Stack Programming",
  "remote-back-end-programming-jobs": "Back-End Programming",
  "remote-front-end-programming-jobs": "Front-End Programming",
  "remote-devops-sysadmin-jobs": "DevOps / Sysadmin",
  "remote-product-jobs": "Product",
}

export function feedUrl(category: string): string {
  return `${FEED_BASE}/${category}.rss`
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

/** Fetch text (RSS/XML) with exponential backoff on 429/5xx. Returns "" on 404. */
export async function textFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml,application/xml,text/xml,*/*;q=0.8",
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
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
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
  category?: string | null
  type?: string | null
  epoch?: number | null
}

export interface JobDetail extends JobCard {
  description: string | null
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

/** Convert the (double-encoded) RSS description HTML into readable text. */
export function descriptionToText(rawDescription: string): string {
  // The feed encodes HTML as entities (&lt;p&gt;…); decode once to get real tags.
  const html = decodeHtmlEntities(rawDescription)
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function tag(chunk: string, name: string): string | null {
  // Handle both <tag>...</tag> and <tag><![CDATA[...]]></tag>.
  const m = chunk.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))
  if (!m) return null
  let v = m[1].trim()
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  if (cdata) v = cdata[1].trim()
  return v
}

/** Slug (last path segment) of a WWR job URL — used as the stable id. */
export function slugFromUrl(url: string): string {
  const m = url.match(/remote-jobs\/([^/?#]+)/i)
  return m ? m[1] : url
}

interface RawItem {
  title: string
  link: string
  guid: string
  pubDate: string | null
  region: string | null
  category: string | null
  type: string | null
  description: string | null
}

/** Parse the <item> chunks of one RSS feed. Each item is parsed independently. */
export function parseItems(xml: string, categoryLabel?: string): RawItem[] {
  const chunks = xml.split(/<item>/).slice(1).map((c) => c.split(/<\/item>/)[0])
  const items: RawItem[] = []
  for (const chunk of chunks) {
    const title = tag(chunk, "title")
    const link = tag(chunk, "link")
    if (!title || !link) continue
    items.push({
      title: decodeHtmlEntities(title),
      link,
      guid: tag(chunk, "guid") ?? link,
      pubDate: tag(chunk, "pubDate"),
      region: tag(chunk, "region"),
      category: tag(chunk, "category") ?? categoryLabel ?? null,
      type: tag(chunk, "type"),
      description: tag(chunk, "description"),
    })
  }
  return items
}

/** Split "Company: Role" into company + title. Falls back to the whole string as title. */
function splitTitle(raw: string): { company: string | null; title: string } {
  const idx = raw.indexOf(": ")
  if (idx > 0 && idx < raw.length - 2) {
    return { company: raw.slice(0, idx).trim(), title: raw.slice(idx + 2).trim() }
  }
  return { company: null, title: raw.trim() }
}

function pubDateEpoch(pubDate: string | null): number | null {
  if (!pubDate) return null
  const t = new Date(pubDate).getTime()
  return isNaN(t) ? null : Math.floor(t / 1000)
}

export function toCard(it: RawItem): JobCard {
  const { company, title } = splitTitle(it.title)
  return {
    id: slugFromUrl(it.link),
    title,
    company,
    location: it.region,
    date: it.pubDate,
    url: it.link,
    category: it.category,
    type: it.type,
    epoch: pubDateEpoch(it.pubDate),
  }
}

export function toDetail(it: RawItem): JobDetail {
  return {
    ...toCard(it),
    description: it.description ? descriptionToText(it.description) : null,
  }
}

/** Query match over title + company (AND semantics on whitespace-separated terms). */
export function matchesQuery(card: JobCard, query: string | undefined): boolean {
  if (!query) return true
  const hay = [card.title, card.company ?? ""].join(" ").toLowerCase()
  return query.toLowerCase().split(/\s+/).every((term) => hay.includes(term))
}

/** Substring match on the region/location. "remote"/"anywhere" always match. */
export function matchesLocation(card: JobCard, location: string | undefined): boolean {
  if (!location) return true
  if (/remote|anywhere/i.test(location)) return true
  return (card.location ?? "").toLowerCase().includes(location.toLowerCase())
}

export function withinDays(card: JobCard, days: number | undefined, nowEpoch: number): boolean {
  if (!days || days <= 0 || days >= 9999) return true
  if (!card.epoch) return true
  return nowEpoch - card.epoch <= days * 86400
}
