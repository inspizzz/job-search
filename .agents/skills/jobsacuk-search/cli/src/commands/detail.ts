import { BASE_URL, BlockedError, htmlFetch, parseDetailPage, writeError } from "../helpers.js"

export interface DetailOpts {
  /** A full jobs.ac.uk URL, or a /job/<REF>/ reference code such as "DSR541". */
  id: string
  format: "json" | "plain"
}

function toUrl(id: string): string | null {
  const raw = id.trim()
  if (/^https?:\/\//i.test(raw)) {
    if (!/(^|\.)jobs\.ac\.uk\//.test(raw)) return null
    return raw
  }
  if (/^\/job\//.test(raw)) return `${BASE_URL}${raw}`
  // A bare reference code needs no slug — jobs.ac.uk redirects to the canonical URL.
  if (/^[A-Z0-9]+$/i.test(raw)) return `${BASE_URL}/job/${raw.toUpperCase()}/`
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const url = toUrl(opts.id)
  if (!url) {
    writeError(
      `"${opts.id}" is not a jobs.ac.uk URL or reference code. Pass a full https://www.jobs.ac.uk/job/... ` +
        `URL, or the reference code from a search result (e.g. DSR541).`,
      "BAD_ID",
    )
    return 1
  }

  try {
    const html = await htmlFetch(url)
    const detail = parseDetailPage(html, url)
    if (!detail) {
      writeError(`Could not parse a posting at ${url} — it may have expired or been removed.`, "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      process.stdout.write(
        [
          detail.title,
          `${detail.employer || "—"} · ${detail.location || "—"} · ${detail.department || "—"}`,
          `salary: ${detail.salary || "—"} · placed ${detail.datePlaced || "—"} · closes ${detail.closes || "—"}`,
          detail.url,
          "",
          detail.description || "(no description parsed — open the URL)",
        ].join("\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    if (e instanceof BlockedError) {
      writeError(e.message, "BLOCKED")
      return 1
    }
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
