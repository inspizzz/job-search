import {
  extractPostings,
  jsonFetch,
  loadRegistry,
  PROVIDERS,
  searchUrl,
  toDetail,
  writeError,
  dateFieldNote,
  type JobDetail,
  type Provider,
} from "../helpers.js"

export interface DetailOpts {
  /** "<provider>:<id>", a bare id (needs --company), or a board URL. */
  id: string
  company?: string
  format: "json" | "plain"
}

interface Target {
  provider: Provider
  slug: string
  jobId: string
}

/** Work out provider + company slug + job id from the id/URL the user passed. */
function resolveTarget(opts: DetailOpts): Target {
  const registry = loadRegistry()
  const raw = opts.id.trim()

  // Board URLs: job-boards[.eu].greenhouse.io/<slug>/jobs/<id>, jobs.lever.co/<slug>/<id>,
  // jobs.ashbyhq.com/<slug>/<id>
  const gh = raw.match(/greenhouse\.io\/(?:embed\/job_app\?for=)?([\w-]+)\/jobs\/(\d+)/)
  if (gh) return { provider: "greenhouse", slug: gh[1]!, jobId: gh[2]! }
  const lv = raw.match(/lever\.co\/([\w-]+)\/([\w-]+)/)
  if (lv) return { provider: "lever", slug: lv[1]!, jobId: lv[2]! }
  const ab = raw.match(/ashbyhq\.com\/([\w-]+)\/([\w-]+)/)
  if (ab) return { provider: "ashby", slug: ab[1]!, jobId: ab[2]! }

  // "<provider>:<id>" as printed by `search --format plain`
  const prefixed = raw.match(/^(greenhouse|lever|ashby):(.+)$/)
  const provider = prefixed ? (prefixed[1] as Provider) : undefined
  const jobId = prefixed ? prefixed[2]! : raw

  if (!opts.company) {
    throw new Error(
      "detail needs to know which company board to look in. Pass --company <slug>, " +
        "or give the full posting URL instead of a bare id.",
    )
  }
  const known = registry.find((c) => c.slug === opts.company)
  const resolved = provider ?? known?.provider
  if (!resolved) {
    throw new Error(
      `Cannot tell which ATS "${opts.company}" uses. Use "<provider>:<id>" (${PROVIDERS.join("|")}) ` +
        `or run "resolve ${opts.company}" first.`,
    )
  }
  return { provider: resolved, slug: opts.company, jobId }
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  let target: Target
  try {
    target = resolveTarget(opts)
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "BAD_ID")
    return 1
  }

  try {
    const registry = loadRegistry()
    const name = registry.find((c) => c.slug === target.slug)?.name ?? target.slug

    // Greenhouse can fetch one posting directly; Lever and Ashby only publish the
    // whole board, so pull it and pick the posting out.
    let raw: any = null
    if (target.provider === "greenhouse") {
      raw = await jsonFetch(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(target.slug)}/jobs/${encodeURIComponent(target.jobId)}`,
      )
    } else {
      const data = await jsonFetch(searchUrl(target.provider, target.slug, true))
      if (data !== null) {
        raw = extractPostings(data, target.provider).find((p: any) => String(p?.id) === target.jobId) ?? null
      }
    }

    if (raw === null) {
      writeError(`No posting ${target.jobId} on the ${target.provider} board for "${target.slug}".`, "NOT_FOUND")
      return 1
    }

    const detail: JobDetail | null = toDetail(raw, target.provider, name)
    if (!detail) {
      writeError(`Posting ${target.jobId} is not publicly listed.`, "NOT_LISTED")
      return 1
    }

    if (opts.format === "plain") {
      process.stdout.write(
        [
          detail.title,
          `${detail.company} · ${detail.location || "—"} · ${detail.department || "—"}`,
          `${detail.provider} · ${(detail.date || "—").slice(0, 10)} (${dateFieldNote(detail.provider)})`,
          detail.url,
          "",
          detail.description || "(no description published)",
        ].join("\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
