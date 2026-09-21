// Data source: Indeed UK public search + viewjob pages (https://uk.indeed.com).
// No official API for anonymous access — the job data is embedded in the page as
// JSON. The SERP carries `window.mosaic.providerData["mosaic-provider-jobcards"]`
// (→ .metaData.mosaicProviderJobCardsModel.results[]); the viewjob page carries
// `window._initialData` with the full description.
//
// Indeed sits behind Cloudflare and its ToS prohibits scraping, so this is
// PERSONAL USE ONLY and best-effort: a plain fetch works at low volume but can be
// intermittently served a Cloudflare challenge instead of data. When that happens
// the CLI reports a CLOUDFLARE_CHALLENGE error rather than returning garbage. You
// can pass a fresh browser cookie via the INDEED_COOKIE env var to get through a
// challenge (copy the Cookie header from a logged-in/cleared browser session).

export const SEARCH_URL = "https://uk.indeed.com/jobs"
export const VIEW_URL = "https://uk.indeed.com/viewjob"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

// NOTE ON TRANSPORT: Indeed's Cloudflare blocks `bun`/`fetch` at the TLS level
// (its JA3/HTTP2 fingerprint is not a real browser's), returning 403 regardless
// of the HTTP headers sent. The system `curl` binary, however, is allowed through
// reliably at low volume. So this helper shells out to `curl` rather than using
// `fetch`. `curl` is a system tool, not an npm dependency, so the package stays
// zero-runtime-dependency. If `curl` is missing, we surface a clear error.
const STATUS_MARKER = "\n__INDEED_HTTP_STATUS__:"

interface CurlResult {
  status: number
  body: string
}

async function curlGet(url: string): Promise<CurlResult> {
  const args = [
    "-s",
    "--compressed",
    "--max-time",
    "25",
    "-A",
    UA,
    "-H",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H",
    "Accept-Language: en-GB,en-US;q=0.9,en;q=0.8",
  ]
  const cookie = process.env.INDEED_COOKIE
  if (cookie && cookie.trim()) args.push("-H", `Cookie: ${cookie.trim()}`)
  args.push("-w", STATUS_MARKER + "%{http_code}", url)

  let proc
  try {
    proc = Bun.spawn(["curl", ...args], { stdout: "pipe", stderr: "pipe" })
  } catch {
    throw new Error("`curl` is required for indeed-search but was not found on PATH.")
  }
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
  if (code !== 0 && !out) {
    throw new Error(`curl failed (exit ${code}) fetching Indeed.`)
  }
  const idx = out.lastIndexOf(STATUS_MARKER)
  if (idx < 0) return { status: 0, body: out }
  const status = parseInt(out.slice(idx + STATUS_MARKER.length).trim(), 10) || 0
  return { status, body: out.slice(0, idx) }
}

/** True when the response body is a Cloudflare interstitial rather than a real page. */
export function isCloudflareChallenge(html: string): boolean {
  if (!html) return false
  return (
    /<title>[^<]*just a moment[^<]*<\/title>/i.test(html) ||
    /verifying you are human/i.test(html) ||
    /cf_chl_opt|challenge-platform\/h\/[bg]\/turnstile/i.test(html) ||
    (/enable javascript and cookies to continue/i.test(html) &&
      !html.includes("mosaic-provider-jobcards"))
  )
}

export class ChallengeError extends Error {
  constructor() {
    super(
      "Indeed served a Cloudflare challenge instead of results. Wait a bit and retry, " +
        "or set INDEED_COOKIE to a fresh Cookie header copied from your browser.",
    )
    this.name = "ChallengeError"
  }
}

/** Fetch HTML via curl with exponential backoff on 403/429/5xx. Returns "" on 404. Throws ChallengeError. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 4
  let delay = 800
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { status, body } = await curlGet(url)
    if (status === 403 || status === 429 || status >= 500) {
      // 403 is Cloudflare blocking — back off and retry, then surface as a challenge.
      if (attempt === maxRetries) {
        if (status === 403 || status === 429) throw new ChallengeError()
        throw new Error(`Request failed: HTTP ${status}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (status === 404) return ""
    if (status !== 200 && status !== 0) {
      throw new Error(`Request failed: HTTP ${status}`)
    }
    if (isCloudflareChallenge(body)) throw new ChallengeError()
    return body
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  remote: boolean
  salary: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
  jobType: string | null
  applyUrl: string | null
}

/**
 * Extract a balanced-brace JSON object that follows `marker` in `html`. Scans
 * character by character, respecting string literals and escapes, so a 200KB blob
 * with nested `};` sequences is captured correctly (non-greedy regex is not safe here).
 */
function extractBalancedJson(html: string, marker: string): string | null {
  const at = html.indexOf(marker)
  if (at < 0) return null
  let i = html.indexOf("{", at)
  if (i < 0) return null
  const start = i
  let depth = 0
  let inStr = false
  let escaped = false
  for (; i < html.length; i++) {
    const ch = html[i]
    if (inStr) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return html.slice(start, i + 1)
    }
  }
  return null
}

function jobUrl(jobkey: string): string {
  return `${VIEW_URL}?jk=${jobkey}`
}

function salaryFrom(result: Record<string, unknown>): string | null {
  const snip = result["salarySnippet"] as { text?: string | boolean } | undefined
  if (snip && typeof snip.text === "string" && snip.text.trim()) return snip.text.trim()
  const extracted = result["extractedSalary"] as
    | { min?: number; max?: number; type?: string }
    | undefined
  if (extracted && (extracted.min || extracted.max)) {
    const parts = [extracted.min, extracted.max].filter((n): n is number => typeof n === "number")
    if (parts.length) return `£${parts.map((n) => n.toLocaleString()).join(" – ")}`
  }
  return null
}

/**
 * Parse the SERP. Returns the job cards from the embedded mosaic JSON. Throws
 * ChallengeError if the page is a Cloudflare interstitial with no data.
 */
export function parseSerp(html: string): JobCard[] {
  if (isCloudflareChallenge(html)) throw new ChallengeError()
  // Anchor on the data ASSIGNMENT, not the bare provider name — the string
  // "mosaic-provider-jobcards" also appears as an HTML `id=` and in config lists,
  // and only `providerData["mosaic-provider-jobcards"]=` precedes the real JSON.
  const blob = extractBalancedJson(html, 'providerData["mosaic-provider-jobcards"]')
  if (!blob) {
    // No data and no obvious challenge markers → treat as an empty result set,
    // unless the page is suspiciously small (a soft block).
    if (html.length < 5000) throw new ChallengeError()
    return []
  }
  let data: any
  try {
    data = JSON.parse(blob)
  } catch {
    return []
  }
  const results: any[] = data?.metaData?.mosaicProviderJobCardsModel?.results ?? []
  const cards: JobCard[] = []
  for (const r of results) {
    const jobkey: string | undefined = r?.jobkey
    if (!jobkey) continue
    const dateEpoch: number | undefined = r?.pubDate ?? r?.createDate
    cards.push({
      id: jobkey,
      title: (r?.displayTitle || r?.title || "(untitled)").toString(),
      company: r?.company ?? null,
      location: r?.formattedLocation ?? null,
      date: r?.formattedRelativeTime ?? (dateEpoch ? new Date(dateEpoch).toISOString() : null),
      // `remoteLocation` is a reliable boolean; `remoteWorkModel` is an object
      // (truthy even for hybrid/onsite), so it must not be used as a remote flag.
      remote: Boolean(r?.remoteLocation),
      salary: salaryFrom(r ?? {}),
      url: jobUrl(jobkey),
    })
  }
  return cards
}

/** Decode a JSON string value that appears in the page as `"key":"...."`. */
function extractInitialDataString(html: string, key: string): string | null {
  const marker = `"${key}":"`
  const at = html.indexOf(marker)
  if (at < 0) return null
  let i = at + marker.length
  const start = i
  let escaped = false
  for (; i < html.length; i++) {
    const ch = html[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === "\\") {
      escaped = true
      continue
    }
    if (ch === '"') break
  }
  const raw = html.slice(start, i)
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return null
  }
}

function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return withBreaks
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Parse the viewjob detail page's embedded `_initialData`. */
export function parseViewJob(html: string, id: string): JobDetail {
  if (isCloudflareChallenge(html)) throw new ChallengeError()
  const title = extractInitialDataString(html, "jobTitle") || "(untitled)"
  const company = extractInitialDataString(html, "companyName")
  const location = extractInitialDataString(html, "formattedLocation")
  const descRaw = extractInitialDataString(html, "sanitizedJobDescription")
  const description = descRaw ? htmlToText(descRaw) : null

  // jobTypes:[{"label":"Full-time"}]
  const jobTypeMatch = html.match(/"jobTypes":\s*\[\s*\{[^}]*?"label":"([^"]+)"/)
  const jobType = jobTypeMatch ? jobTypeMatch[1] : null

  return {
    id,
    title,
    company,
    location,
    date: null,
    remote: /remote/i.test(location ?? ""),
    salary: null,
    url: `${VIEW_URL}?jk=${id}`,
    description,
    jobType,
    applyUrl: `${VIEW_URL}?jk=${id}`,
  }
}

/** Map --jobage days to Indeed's `fromage` parameter (days, capped by Indeed at 14). */
export function jobageParam(days: number): string | null {
  if (!days || days <= 0 || days >= 9999) return null
  return String(days)
}
