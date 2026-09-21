// Data source: the public job-board APIs exposed by applicant tracking systems.
// These are keyless, sanctioned read endpoints — the same JSON the company's own
// careers page consumes — not a scrape:
//
//   Greenhouse  https://boards-api.greenhouse.io/v1/boards/<slug>/jobs
//   Lever       https://api.lever.co/v0/postings/<slug>?mode=json
//   Ashby       https://api.ashbyhq.com/posting-api/job-board/<slug>
//
// Coverage is per-company, not market-wide: you get every opening at the companies
// in companies.json, the day it goes live, with no aggregator lag. Use it alongside
// a market-wide source (Adzuna, LinkedIn), not instead of one.
//
// Workable's v3 endpoint was probed and deliberately left out: it answers POST but
// returns `total: 0` for both real and nonexistent accounts, so a slug cannot be
// verified. Add it here only once that is resolved.

import { readFileSync } from "fs"
import { join } from "path"

export type Provider = "greenhouse" | "lever" | "ashby"

export const PROVIDERS: Provider[] = ["greenhouse", "lever", "ashby"]

export const REGISTRY_PATH = join(import.meta.dir, "../companies.json")

export interface Company {
  name: string
  slug: string
  provider: Provider
  tags?: string[]
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RegistryError"
  }
}

export function loadRegistry(): Company[] {
  let raw: string
  try {
    raw = readFileSync(REGISTRY_PATH, "utf8")
  } catch {
    throw new RegistryError(`Company registry not found at ${REGISTRY_PATH}`)
  }
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new RegistryError(`Company registry is not valid JSON: ${e instanceof Error ? e.message : e}`)
  }
  const list = Array.isArray(parsed?.companies) ? parsed.companies : []
  return list.filter(
    (c: any): c is Company =>
      typeof c?.slug === "string" && PROVIDERS.includes(c?.provider),
  )
}

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. 404 returns null (unknown slug). */
export async function jsonFetch(url: string, init?: RequestInit): Promise<any | null> {
  const maxRetries = 4
  let delay = 400
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) },
      redirect: "follow",
    })
    if (response.status === 404) return null
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`${url} failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 400)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 6000)
      continue
    }
    if (!response.ok) {
      throw new Error(`${url} failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
  throw new Error(`${url} failed after max retries`)
}

export interface JobCard {
  id: string
  title: string
  company: string
  provider: Provider
  location: string | null
  /** ISO-8601. NOTE: the underlying field differs per provider — see dateFieldNote(). */
  date: string | null
  department: string | null
  /**
   * Advertised pay, where the ATS publishes it structurally. In practice only Ashby
   * does, and only when the employer opted in — usually US roles under pay-transparency
   * law. Greenhouse and Lever expose no salary field at all (Greenhouse buries it in the
   * description prose), so this is null for them.
   */
  salary: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
}

/** Each ATS exposes a different timestamp; --jobage filters on whichever one is available. */
export function dateFieldNote(provider: Provider): string {
  switch (provider) {
    case "greenhouse":
      return "updated_at (last updated, not first posted)"
    case "lever":
      return "createdAt (first posted)"
    case "ashby":
      return "publishedAt (first published)"
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)))
    .replace(/&amp;/g, "&")
}

export function stripTags(html: string): string {
  // Greenhouse returns the posting body entity-encoded (&lt;p&gt;...), so entities
  // must be decoded BEFORE tags are stripped or the markup survives as literal text.
  let s = decodeEntities(html)
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
  // A second pass catches entities that were themselves encoded inside the markup.
  return decodeEntities(s)
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function iso(value: unknown): string | null {
  if (value == null) return null
  // Lever gives epoch milliseconds; Greenhouse/Ashby give ISO strings.
  const d = typeof value === "number" ? new Date(value) : new Date(String(value))
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function searchUrl(provider: Provider, slug: string, withContent = false): string {
  switch (provider) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs${withContent ? "?content=true" : ""}`
    case "lever":
      return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
    case "ashby":
      // Always request compensation: it is the only provider that publishes pay
      // structurally, and the parameter costs nothing on the list call.
      return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`
  }
}

/**
 * Ashby's compensation block. `compensationTierSummary` is the richer string
 * ("$150K – $200K • Offers Equity"); the scrapeable variant is the bare range. Both are
 * null on postings where the employer did not publish pay, which is most of them outside
 * jurisdictions with pay-transparency laws.
 */
function ashbySalary(raw: any): string | null {
  const c = raw?.compensation
  if (!c) return null
  const summary = c.compensationTierSummary ?? c.scrapeableCompensationSalarySummary
  return typeof summary === "string" && summary.trim().length > 0 ? summary.trim() : null
}

/** Normalise one raw posting into a JobCard. Returns null for postings that are not live. */
export function toCard(raw: any, provider: Provider, companyName: string): JobCard | null {
  switch (provider) {
    case "greenhouse":
      return {
        id: String(raw?.id ?? ""),
        title: String(raw?.title ?? "(untitled)").trim(),
        company: companyName,
        provider,
        location: raw?.location?.name ?? null,
        date: iso(raw?.updated_at ?? raw?.first_published),
        department: Array.isArray(raw?.departments) && raw.departments.length ? raw.departments[0]?.name ?? null : null,
        salary: null, // Greenhouse publishes no salary field
        url: String(raw?.absolute_url ?? ""),
      }
    case "lever":
      return {
        id: String(raw?.id ?? ""),
        title: String(raw?.text ?? "(untitled)").trim(),
        company: companyName,
        provider,
        location: raw?.categories?.location ?? null,
        date: iso(raw?.createdAt),
        department: raw?.categories?.department ?? raw?.categories?.team ?? null,
        salary: null, // Lever publishes no salary field
        url: String(raw?.hostedUrl ?? raw?.applyUrl ?? ""),
      }
    case "ashby": {
      // Ashby returns unlisted/draft postings alongside live ones.
      if (raw?.isListed === false) return null
      return {
        id: String(raw?.id ?? ""),
        title: String(raw?.title ?? "(untitled)").trim(),
        company: companyName,
        provider,
        location: raw?.location ?? null,
        date: iso(raw?.publishedAt),
        department: raw?.department ?? raw?.team ?? null,
        salary: ashbySalary(raw),
        url: String(raw?.jobUrl ?? raw?.applyUrl ?? ""),
      }
    }
  }
}

export function toDetail(raw: any, provider: Provider, companyName: string): JobDetail | null {
  const card = toCard(raw, provider, companyName)
  if (!card) return null
  const html =
    provider === "greenhouse" ? raw?.content : provider === "lever" ? raw?.descriptionPlain ?? raw?.description : raw?.descriptionHtml ?? raw?.descriptionPlain
  return { ...card, description: html ? stripTags(String(html)) : null }
}

/** Pull the postings array out of a provider's response envelope. */
export function extractPostings(data: any, provider: Provider): any[] {
  switch (provider) {
    case "greenhouse":
      return Array.isArray(data?.jobs) ? data.jobs : []
    case "lever":
      return Array.isArray(data) ? data : []
    case "ashby":
      return Array.isArray(data?.jobs) ? data.jobs : []
  }
}
