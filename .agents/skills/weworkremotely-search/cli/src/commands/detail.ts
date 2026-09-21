import {
  CATEGORIES,
  feedUrl,
  textFetch,
  parseItems,
  toDetail,
  slugFromUrl,
  writeError,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  // Accept a slug, a full WWR job URL, or a guid — all normalise to the slug.
  const wanted = slugFromUrl(opts.id)
  try {
    // The RSS carries the full description, so we locate the item across the
    // default category feeds rather than fetching the (JS-heavy) job page.
    const settled = await Promise.allSettled(
      Object.keys(CATEGORIES).map(async (slug) => {
        const xml = await textFetch(feedUrl(slug))
        return parseItems(xml, CATEGORIES[slug])
      }),
    )

    for (const r of settled) {
      if (r.status !== "fulfilled") continue
      const hit = r.value.find((it) => slugFromUrl(it.link) === wanted)
      if (hit) {
        const detail = toDetail(hit)
        if (opts.format === "plain") {
          const lines = [
            detail.title,
            `${detail.company || "—"} · ${detail.location || "—"} · ${detail.date || "—"}`,
            detail.type ? `Type: ${detail.type}` : "",
            detail.category ? `Category: ${detail.category}` : "",
            "",
            detail.description || "(no description)",
            "",
            `URL: ${detail.url}`,
          ].filter((l) => l !== "")
          process.stdout.write(lines.join("\n") + "\n")
        } else {
          process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
        }
        return 0
      }
    }

    writeError(
      `Job "${opts.id}" not found in the current WeWorkRemotely feeds (they only hold recent postings).`,
      "NOT_FOUND",
    )
    return 1
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
