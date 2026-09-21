// Data source: Adzuna's official Jobs API (https://developer.adzuna.com/).
// This is a sanctioned API, not a scrape — but it requires free credentials:
// an app id and app key, read from the ADZUNA_APP_ID / ADZUNA_APP_KEY env vars.
// Adzuna aggregates UK listings from many boards (Indeed, Reed, CV-Library,
// Totaljobs, employer sites), so it gives broad UK coverage from one endpoint.
//
// Country is fixed to "gb" (United Kingdom). Change COUNTRY for other markets.

export const COUNTRY = "gb"
export const API_BASE = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search`

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export interface Credentials {
  appId: string
  appKey: string
}

export class MissingCredentialsError extends Error {
  constructor() {
    super(
      "Adzuna API credentials not set. Get a free key at https://developer.adzuna.com/signup " +
        "then export ADZUNA_APP_ID and ADZUNA_APP_KEY (or prefix the command with them).",
    )
    this.name = "MissingCredentialsError"
  }
}

export function getCredentials(): Credentials {
  const appId = (process.env.ADZUNA_APP_ID || "").trim()
  const appKey = (process.env.ADZUNA_APP_KEY || "").trim()
  if (!appId || !appKey) throw new MissingCredentialsError()
  return { appId, appKey }
}

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. Throws on 401 (bad creds) and other 4xx. */
export async function jsonFetch(url: string): Promise<any> {
  const maxRetries = 5
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Adzuna API request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Adzuna rejected the credentials (HTTP 401/403). Check ADZUNA_APP_ID / ADZUNA_APP_KEY.")
    }
    if (!response.ok) {
      let detail = ""
      try {
        detail = (await response.json())?.exception ?? (await response.text())
      } catch {
        /* ignore */
      }
      throw new Error(`Adzuna API request failed: ${response.status} ${detail}`.trim())
    }
    return response.json()
  }
  throw new Error("Adzuna API request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  salary: string | null
  contract: string | null
  category: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
}

function salaryText(r: any): string | null {
  const min = typeof r?.salary_min === "number" ? r.salary_min : null
  const max = typeof r?.salary_max === "number" ? r.salary_max : null
  if (min == null && max == null) return null
  const fmt = (n: number) => `£${Math.round(n).toLocaleString()}`
  if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max)}`
  return fmt((min ?? max) as number)
}

function contractText(r: any): string | null {
  const parts = [r?.contract_time, r?.contract_type].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  )
  // e.g. "full_time" + "permanent" -> "full time, permanent"
  return parts.length ? parts.map((p) => p.replace(/_/g, " ")).join(", ") : null
}

export function toCard(r: any): JobCard {
  return {
    id: String(r?.id ?? ""),
    title: r?.title ? stripTags(String(r.title)) : "(untitled)",
    company: r?.company?.display_name ?? null,
    location: r?.location?.display_name ?? null,
    date: r?.created ?? null,
    salary: salaryText(r),
    contract: contractText(r),
    category: r?.category?.label ?? null,
    url: r?.redirect_url ?? "",
  }
}

export function toDetail(r: any): JobDetail {
  return {
    ...toCard(r),
    description: r?.description ? stripTags(String(r.description)) : null,
  }
}
