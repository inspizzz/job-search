import { describe, expect, test } from "bun:test"
import { runCLI, parseJSON } from "./helpers"

// Live smoke tests against jobs.ac.uk. This is a scrape, so these tests double as a
// canary: if the site's markup changes, they fail here rather than silently returning
// zero jobs during a real search.

interface SearchResponse {
  meta: { count: number; total: number; page: number; pageSizeFromSite: number; locationFilteredClientSide: boolean }
  results: {
    id: string
    title: string
    employer: string | null
    location: string | null
    salary: string | null
    datePlaced: string | null
    url: string
  }[]
}

describe.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("search", () => {
  test("returns parseable cards with the core fields populated", async () => {
    const res = await runCLI(["search", "-q", "quantum", "-n", "10"])
    const data = parseJSON<SearchResponse>(res)
    expect(data.results.length).toBeGreaterThan(0)
    for (const job of data.results) {
      expect(job.id).toBeTruthy()
      expect(job.title).toBeTruthy()
      expect(job.url).toStartWith("https://www.jobs.ac.uk/job/")
    }
    // Employer and location are the fields most likely to break on a markup change.
    const withEmployer = data.results.filter((j) => j.employer)
    expect(withEmployer.length).toBeGreaterThan(data.results.length / 2)
  })

  test("the site returns a full page of results", async () => {
    const data = parseJSON<SearchResponse>(await runCLI(["search", "-q", "research"]))
    expect(data.meta.pageSizeFromSite).toBeGreaterThan(1)
  })

  test("client-side location filter narrows results and is flagged in meta", async () => {
    const data = parseJSON<SearchResponse>(await runCLI(["search", "-q", "research", "-l", "London"]))
    expect(data.meta.locationFilteredClientSide).toBe(true)
    for (const job of data.results) {
      expect(job.location!.toLowerCase()).toContain("london")
    }
  })

  test("page 2 returns different postings from page 1", async () => {
    const p1 = parseJSON<SearchResponse>(await runCLI(["search", "-q", "quantum", "--page", "1"]))
    const p2 = parseJSON<SearchResponse>(await runCLI(["search", "-q", "quantum", "--page", "2"]))
    const overlap = p1.results.filter((a) => p2.results.some((b) => b.id === a.id))
    expect(overlap.length).toBe(0)
  })

  test("--limit caps results while total reports the full page", async () => {
    const data = parseJSON<SearchResponse>(await runCLI(["search", "-q", "quantum", "-n", "3"]))
    expect(data.results.length).toBeLessThanOrEqual(3)
    expect(data.meta.total).toBeGreaterThanOrEqual(data.results.length)
  })
})

describe("detail", () => {
  test.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("resolves a posting from a search result and returns structured fields", async () => {
    const list = parseJSON<SearchResponse>(await runCLI(["search", "-q", "quantum", "-n", "1"]))
    const res = await runCLI(["detail", list.results[0]!.url])
    const data = parseJSON<{
      title: string
      employer: string | null
      datePlaced: string | null
      description: string | null
    }>(res)
    expect(data.title).toBeTruthy()
    expect(data.employer).toBeTruthy()
    // The detail page carries JSON-LD, so the date must come back ISO-8601, not "21 Aug".
    expect(data.datePlaced).toMatch(/^\d{4}-\d{2}-\d{2}/)
    expect(data.description).toBeTruthy()
    expect(data.description).not.toContain("<p>")
    expect(data.description).not.toContain("&lt;")
  })

  test.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("accepts a bare reference code", async () => {
    const list = parseJSON<SearchResponse>(await runCLI(["search", "-q", "research", "-n", "1"]))
    const ref = list.results[0]!.url.match(/\/job\/([A-Z0-9]+)\//i)![1]!
    const data = parseJSON<{ title: string }>(await runCLI(["detail", ref]))
    expect(data.title).toBeTruthy()
  })

  test("rejects a non-jobs.ac.uk URL with BAD_ID", async () => {
    const res = await runCLI(["detail", "https://example.com/job/123"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ID")
  })
})

describe("argument validation", () => {
  test("non-numeric --page exits 1 with BAD_ARG", async () => {
    const res = await runCLI(["search", "--page", "abc"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ARG")
  })

  test("unknown command exits 1 with BAD_CMD", async () => {
    const res = await runCLI(["frobnicate"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_CMD")
  })

  test("detail with no id exits 1 with NO_ID", async () => {
    const res = await runCLI(["detail"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("NO_ID")
  })

  test("no arguments prints help and exits 1", async () => {
    const res = await runCLI([])
    expect(res.exitCode).toBe(1)
    expect(res.stdout).toContain("jobsacuk-search")
  })
})
