import { VIEW_URL, htmlFetch, parseViewJob, ChallengeError, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a bare jobkey, a viewjob URL, or any URL carrying jk=. */
function normalizeId(input: string): string | null {
  const jk = input.match(/[?&]jk=([a-f0-9]{10,})/i)
  if (jk) return jk[1]
  const bare = input.match(/^[a-f0-9]{10,}$/i)
  if (bare) return input
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse an Indeed jobkey from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await htmlFetch(`${VIEW_URL}?jk=${id}`)
    if (!html) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = parseViewJob(html, id)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}${job.remote ? " · remote" : ""}`,
        job.jobType ? `Type: ${job.jobType}` : "",
        job.salary ? `Salary: ${job.salary}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    if (e instanceof ChallengeError) {
      writeError(e.message, "CLOUDFLARE_CHALLENGE")
      return 1
    }
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
