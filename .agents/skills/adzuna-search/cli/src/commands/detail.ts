import { API_BASE, getCredentials, jsonFetch, toDetail, MissingCredentialsError, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

// The Adzuna Jobs API has no by-id endpoint, and the public details page on
// adzuna.co.uk answers 403 to every non-browser client — an earlier version of this
// command scraped that page and could never have worked.
//
// It does, however, index the numeric job id as a searchable token: querying
// `what=<id>` returns exactly that posting (verified against 6 consecutive ids,
// count=1 and an exact id match every time). So detail is answered through the
// sanctioned API, with the id match asserted rather than assumed.
//
// One honest limitation: Adzuna truncates `description` to 500 characters with an
// ellipsis. There is no endpoint that returns the full body, so `url` is included
// for the complete posting.

const ADZUNA_DESCRIPTION_LIMIT = 500

function extractId(input: string): string | null {
  const raw = input.trim()
  // Accept a bare id, or any Adzuna URL carrying one (details/, jobs/land/ad/, ...).
  const fromUrl = raw.match(/adzuna\.[a-z.]+\/[^\s]*?(\d{7,})/i)
  if (fromUrl) return fromUrl[1]!
  const bare = raw.match(/^(\d{7,})$/)
  if (bare) return bare[1]!
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = extractId(opts.id)
  if (!id) {
    writeError(
      `Could not read an Adzuna job id from "${opts.id}". Pass the numeric id from a search ` +
        `result, or an adzuna.co.uk URL containing one.`,
      "BAD_ID",
    )
    return 1
  }

  try {
    const { appId, appKey } = getCredentials()
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      "content-type": "application/json",
      what: id,
      results_per_page: "10",
    })
    const data = await jsonFetch(`${API_BASE}/1?${params.toString()}`)
    const results: any[] = Array.isArray(data?.results) ? data.results : []

    // Never return a near-miss: the id search is a keyword query, so confirm the hit.
    const match = results.find((r) => String(r?.id) === id)
    if (!match) {
      writeError(
        `No Adzuna posting with id ${id}. It may have expired — Adzuna drops filled and ` +
          `withdrawn adverts from the index.`,
        "NOT_FOUND",
      )
      return 1
    }

    const detail = toDetail(match)
    const truncated = (detail.description?.length ?? 0) >= ADZUNA_DESCRIPTION_LIMIT - 5

    if (opts.format === "plain") {
      process.stdout.write(
        [
          detail.title,
          `${detail.company || "—"} · ${detail.location || "—"} · ${detail.salary || "—"} · ${(detail.date || "—").slice(0, 10)}`,
          detail.contract ? `contract: ${detail.contract}` : null,
          detail.category ? `category: ${detail.category}` : null,
          "",
          detail.description || "(no description)",
          truncated ? "\n[Adzuna truncates descriptions to 500 characters — open the URL for the full posting.]" : null,
          "",
          `URL: ${detail.url}`,
        ]
          .filter((l): l is string => l !== null)
          .join("\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify({ ...detail, descriptionTruncated: truncated }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    if (e instanceof MissingCredentialsError) {
      writeError(e.message, "MISSING_CREDENTIALS")
      return 1
    }
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
