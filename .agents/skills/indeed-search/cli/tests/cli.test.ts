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
  meta: { count: number; page: number };
  results: Array<{ id: string; title: string; company: string | null; url: string }>;
}

describe("indeed-search CLI", () => {
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

    test("detail with an unparseable id exits 1 with BAD_ID", async () => {
      const r = await runCLI(["detail", "not-a-jobkey!"]);
      expect(r.exitCode).not.toBe(0);
      expect(parsedStderr(r.stderr).code).toBe("BAD_ID");
    });

    test("unknown command exits 1 with BAD_CMD", async () => {
      const r = await runCLI(["frobnicate"]);
      expect(r.exitCode).not.toBe(0);
      expect(parsedStderr(r.stderr).code).toBe("BAD_CMD");
    });
  });

  describe("live search (network, best-effort)", () => {
    // Indeed is behind Cloudflare. A clean run returns parseable results; a blocked
    // run must fail gracefully with CLOUDFLARE_CHALLENGE. Both are acceptable — what
    // is NOT acceptable is a crash or garbage output.
    test("returns valid results OR a clean CLOUDFLARE_CHALLENGE", async () => {
      const r = await runCLI([
        "search", "-q", "AI engineer", "-l", "London", "--limit", "5", "--format", "json",
      ]);
      if (r.exitCode === 0) {
        const data = parseJSON<SearchResult>(r);
        expect(Array.isArray(data.results)).toBe(true);
        if (data.results.length > 0) {
          const first = data.results[0];
          expect(first.id).toBeTruthy();
          expect(first.title).toBeTruthy();
          expect(first.url).toMatch(/indeed\.com/i);
        }
      } else {
        expect(parsedStderr(r.stderr).code).toBe("CLOUDFLARE_CHALLENGE");
      }
    });
  });
});
