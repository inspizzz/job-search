import { API_URL, jsonFetch, parseFeed, toDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw numeric id, a slug, or a remoteok.com job URL. */
function normalizeId(input: string): string {
  const urlMatch = input.match(/remote-jobs\/(?:.*-)?(\d{4,})(?:$|[/?#])/i)
  if (urlMatch) return urlMatch[1]
  const bare = input.match(/(\d{4,})/)
  return bare ? bare[1] : input
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  try {
    const raw = await jsonFetch(API_URL)
    const jobs = parseFeed(raw)
    const job = jobs.find(
      (j) => String(j.id) === id || (j.slug ?? "").includes(id) || (j.url ?? "").includes(opts.id),
    )
    if (!job) {
      writeError(
        `Job "${opts.id}" not found in the current RemoteOK feed (the public feed only holds recent postings).`,
        "NOT_FOUND",
      )
      return 1
    }
    const detail = toDetail(job)

    if (opts.format === "plain") {
      const lines = [
        detail.title,
        `${detail.company || "—"} · ${detail.location || "—"} · ${detail.date || "—"}`,
        detail.salary ? `Salary: ${detail.salary}` : "",
        detail.tags && detail.tags.length ? `Tags: ${detail.tags.join(", ")}` : "",
        "",
        detail.description || "(no description)",
        "",
        `URL: ${detail.url}`,
        detail.applyUrl ? `Apply: ${detail.applyUrl}` : "",
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
