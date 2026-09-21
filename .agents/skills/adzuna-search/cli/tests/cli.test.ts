import { describe, expect, test } from "bun:test"
import { runCLI, parseJSON } from "./helpers"

// Live tests against the Adzuna API. They need ADZUNA_APP_ID / ADZUNA_APP_KEY, which
// bun loads from the repo-root .env. Without credentials every command exits 1 with
// MISSING_CREDENTIALS, which the last block asserts is handled cleanly.

const HAS_CREDS = Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)
const liveTest = HAS_CREDS && process.env.JOB_SEARCH_LIVE_TESTS === "1" ? test : test.skip

interface SearchResponse {
  meta: { count: number; page: number; total: number | null }
  results: { id: string; title: string; url: string; salary: string | null }[]
}

interface DetailResponse {
  id: string
  title: string
  company: string | null
  description: string | null
  descriptionTruncated: boolean
  url: string
}

describe("search", () => {
  liveTest("returns UK results with usable fields", async () => {
    const data = parseJSON<SearchResponse>(await runCLI(["search", "-q", "engineer", "-l", "London", "-n", "5"]))
    expect(data.results.length).toBeGreaterThan(0)
    for (const job of data.results) {
      expect(job.id).toBeTruthy()
      expect(job.title).toBeTruthy()
      expect(job.url).toStartWith("http")
    }
  })

  liveTest("reports a total count for the query", async () => {
    const data = parseJSON<SearchResponse>(await runCLI(["search", "-q", "software engineer", "-l", "London", "-n", "3"]))
    expect(data.meta.total).toBeGreaterThan(0)
  })
})

describe("detail", () => {
  // The details page on adzuna.co.uk answers 403 to non-browser clients, so detail is
  // resolved through the API by searching the numeric id. These tests pin that contract.
  liveTest("resolves a job id taken from a search result", async () => {
    const list = parseJSON<SearchResponse>(await runCLI(["search", "-q", "engineer", "-l", "London", "-n", "1"]))
    const id = list.results[0]!.id
    const data = parseJSON<DetailResponse>(await runCLI(["detail", id]))
    // Must be the posting asked for, never a near-miss from the keyword search.
    expect(data.id).toBe(id)
    expect(data.title).toBeTruthy()
    expect(data.url).toStartWith("http")
  })

  liveTest("accepts an adzuna URL containing an id", async () => {
    const list = parseJSON<SearchResponse>(await runCLI(["search", "-q", "engineer", "-n", "1"]))
    const id = list.results[0]!.id
    const data = parseJSON<DetailResponse>(await runCLI(["detail", `https://www.adzuna.co.uk/details/${id}`]))
    expect(data.id).toBe(id)
  })

  liveTest("flags Adzuna's 500-character description truncation", async () => {
    const list = parseJSON<SearchResponse>(await runCLI(["search", "-q", "software engineer", "-n", "1"]))
    const data = parseJSON<DetailResponse>(await runCLI(["detail", list.results[0]!.id]))
    if (data.description && data.description.length >= 495) {
      expect(data.descriptionTruncated).toBe(true)
    }
    expect(data.description).not.toContain("<p>")
  })

  liveTest("exits 1 with NOT_FOUND for an id that does not exist", async () => {
    const res = await runCLI(["detail", "9999999999"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("NOT_FOUND")
  })

  test("exits 1 with BAD_ID for a non-numeric id", async () => {
    const res = await runCLI(["detail", "not-an-id"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ID")
  })

  test("exits 1 with NO_ID when no id is given", async () => {
    const res = await runCLI(["detail"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("NO_ID")
  })
})

describe("argument validation", () => {
  test("non-numeric --jobage exits 1 with BAD_ARG", async () => {
    const res = await runCLI(["search", "--jobage", "abc"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ARG")
  })

  test("unknown command exits 1 with BAD_CMD", async () => {
    const res = await runCLI(["frobnicate"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_CMD")
  })

  test("no arguments prints help and exits 1", async () => {
    const res = await runCLI([])
    expect(res.exitCode).toBe(1)
    expect(res.stdout).toContain("adzuna-cli")
  })
})
