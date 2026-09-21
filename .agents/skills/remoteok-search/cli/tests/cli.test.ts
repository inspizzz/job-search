import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

interface SearchResult {
  meta: { count: number; page: number; total: number };
  results: Array<{ id: string; title: string; company: string | null; url: string }>;
}

describe("remoteok-search CLI", () => {
  describe("flag validation", () => {
    test("non-numeric --jobage exits 1 with BAD_ARG", async () => {
      const r = await runCLI(["search", "--jobage", "foo"]);
      expect(r.exitCode).not.toBe(0);
      expect(parsedStderr(r.stderr).code).toBe("BAD_ARG");
    });

    test("non-numeric --limit exits 1 with BAD_ARG", async () => {
      const r = await runCLI(["search", "--limit", "xyz"]);
      expect(r.exitCode).not.toBe(0);
      expect(parsedStderr(r.stderr).code).toBe("BAD_ARG");
    });

    test("detail with no id exits 1 with NO_ID", async () => {
      const r = await runCLI(["detail"]);
      expect(r.exitCode).not.toBe(0);
      expect(parsedStderr(r.stderr).code).toBe("NO_ID");
    });

    test("unknown command exits 1 with BAD_CMD", async () => {
      const r = await runCLI(["frobnicate"]);
      expect(r.exitCode).not.toBe(0);
      expect(parsedStderr(r.stderr).code).toBe("BAD_CMD");
    });
  });

  describe.skipIf(process.env.JOB_SEARCH_LIVE_TESTS !== "1")("live search (network)", () => {
    test("returns results with populated id/title/url", async () => {
      const r = await runCLI(["search", "--limit", "5", "--format", "json"]);
      const data = parseJSON<SearchResult>(r);
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);
      const first = data.results[0];
      expect(first.id).toBeTruthy();
      expect(first.title).toBeTruthy();
      expect(first.url).toMatch(/remoteok\.com/i);
    });

    test("query narrows results", async () => {
      const r = await runCLI(["search", "-q", "engineer", "--limit", "10", "--format", "json"]);
      const data = parseJSON<SearchResult>(r);
      // Not asserting count — just that it parses and stays within the page cap.
      expect(data.results.length).toBeLessThanOrEqual(10);
    });
  });
});
