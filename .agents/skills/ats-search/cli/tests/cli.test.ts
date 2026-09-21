import { describe, expect, test } from "bun:test"
import { runCLI, parseJSON } from "./helpers"

// Live smoke tests. They hit the real ATS endpoints, so a network failure or a
// company closing every vacancy will fail them — that is intentional: this CLI's
// whole job is that those endpoints keep answering.

interface SearchResponse {
  meta: { count: number; total: number; companiesQueried: number; providers: string[]; errors: unknown[] }
  results: { id: string; title: string; url: string; provider: string; company: string }[]
}

describe.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("search", () => {
  test("greenhouse board returns usable cards", async () => {
    const res = await runCLI(["search", "-c", "riverlane", "-n", "5"])
    const data = parseJSON<SearchResponse>(res)
    expect(data.results.length).toBeGreaterThan(0)
    for (const job of data.results) {
      expect(job.id).toBeTruthy()
      expect(job.title).toBeTruthy()
      expect(job.url).toStartWith("http")
      expect(job.provider).toBe("greenhouse")
    }
  })

  test("lever board returns usable cards", async () => {
    const res = await runCLI(["search", "-c", "palantir", "-n", "5"])
    const data = parseJSON<SearchResponse>(res)
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.results[0]!.provider).toBe("lever")
    expect(data.results[0]!.url).toStartWith("http")
  })

  test("ashby board returns usable cards", async () => {
    const res = await runCLI(["search", "-c", "synthesia", "-n", "5"])
    const data = parseJSON<SearchResponse>(res)
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.results[0]!.provider).toBe("ashby")
  })

  test("location filter is applied", async () => {
    const res = await runCLI(["search", "-c", "palantir", "-l", "London", "-n", "10"])
    const data = parseJSON<SearchResponse>(res)
    for (const job of data.results) {
      expect((job as any).location.toLowerCase()).toContain("london")
    }
  })

  test("results are sorted newest first", async () => {
    const res = await runCLI(["search", "-c", "riverlane", "-n", "10"])
    const data = parseJSON<SearchResponse>(res)
    const dates = data.results.map((j) => (j as any).date).filter(Boolean)
    const sorted = [...dates].sort((a, b) => b.localeCompare(a))
    expect(dates).toEqual(sorted)
  })

  test("--limit caps results but total reports the full count", async () => {
    const res = await runCLI(["search", "-c", "palantir", "-n", "2"])
    const data = parseJSON<SearchResponse>(res)
    expect(data.results.length).toBeLessThanOrEqual(2)
    expect(data.meta.total).toBeGreaterThanOrEqual(data.results.length)
  })
})

describe.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("salary", () => {
  test("ashby compensation is surfaced when the employer published it", async () => {
    // Ashby is the only provider exposing pay structurally, and only where the employer
    // opted in — typically US roles under pay-transparency law. Assert the plumbing works
    // rather than that any particular posting has pay.
    const data = parseJSON<SearchResponse & { meta: { withSalary: number } }>(
      await runCLI(["search", "-c", "synthesia", "-n", "100"]),
    )
    const paid = data.results.filter((j) => (j as any).salary)
    expect(data.meta.withSalary).toBe(paid.length)
    for (const job of paid) {
      expect(typeof (job as any).salary).toBe("string")
      expect((job as any).salary.length).toBeGreaterThan(0)
    }
  })

  test("greenhouse and lever report null salary rather than inventing one", async () => {
    for (const slug of ["riverlane", "palantir"]) {
      const data = parseJSON<SearchResponse>(await runCLI(["search", "-c", slug, "-n", "5"]))
      for (const job of data.results) {
        expect((job as any).salary).toBeNull()
      }
    }
  })
})

describe.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("resolve", () => {
  test("identifies the ATS behind a known slug", async () => {
    const res = await runCLI(["resolve", "riverlane"])
    const data = parseJSON<{ resolved: string; registryEntry: { provider: string } }>(res)
    expect(data.resolved).toBe("greenhouse")
    expect(data.registryEntry.provider).toBe("greenhouse")
  })

  test("exits 1 with UNRESOLVED for a slug on no supported board", async () => {
    const res = await runCLI(["resolve", "definitely-not-a-real-company-xyz"])
    expect(res.exitCode).toBe(1)
    expect(res.stderr).toContain("UNRESOLVED")
  })
})

describe("detail", () => {
  test.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("fetches a posting from its board URL", async () => {
    const list = parseJSON<SearchResponse>(await runCLI(["search", "-c", "riverlane", "-n", "1"]))
    const url = list.results[0]!.url
    const res = await runCLI(["detail", url])
    const data = parseJSON<{ title: string; description: string | null }>(res)
    expect(data.title).toBeTruthy()
    // Greenhouse bodies arrive entity-encoded; they must come back as plain text.
    expect(data.description).not.toContain("&lt;")
    expect(data.description).not.toContain("<p>")
  })

  test("exits 1 when given a bare id with no company", async () => {
    const res = await runCLI(["detail", "12345"])
    expect(res.exitCode).toBe(1)
    expect(res.stderr).toContain("BAD_ID")
  })
})

describe("argument validation", () => {
  test("non-numeric --jobage exits 1 with BAD_ARG", async () => {
    const res = await runCLI(["search", "--jobage", "abc"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ARG")
  })

  test("unsupported --provider exits 1 with BAD_ARG", async () => {
    const res = await runCLI(["search", "-p", "bamboohr"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ARG")
  })

  test("unknown company without --provider exits 1 with BAD_COMPANY", async () => {
    const res = await runCLI(["search", "-c", "notarealcompany"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_COMPANY")
  })

  test("unknown command exits 1 with BAD_CMD", async () => {
    const res = await runCLI(["frobnicate"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_CMD")
  })

  test("no arguments prints help and exits 1", async () => {
    const res = await runCLI([])
    expect(res.exitCode).toBe(1)
    expect(res.stdout).toContain("ats-search")
  })
})
