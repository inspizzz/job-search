import { extractPostings, jsonFetch, PROVIDERS, searchUrl, writeError, type Provider } from "../helpers.js"

export interface ResolveOpts {
  slug: string
  format: "json" | "plain"
}

/**
 * Probe every provider for a slug and report which one hosts a live board.
 * This is how you add a company to companies.json: the slug is normally the last
 * path segment of the company's careers-page URL.
 */
export async function runResolve(opts: ResolveOpts): Promise<number> {
  const findings: { provider: Provider; jobs: number }[] = []
  const checked: { provider: Provider; result: string }[] = []

  for (const provider of PROVIDERS) {
    try {
      const data = await jsonFetch(searchUrl(provider, opts.slug))
      if (data === null) {
        checked.push({ provider, result: "404 — no board" })
        continue
      }
      const jobs = extractPostings(data, provider).length
      findings.push({ provider, jobs })
      checked.push({ provider, result: `200 — ${jobs} posting(s)` })
    } catch (e) {
      checked.push({ provider, result: e instanceof Error ? e.message : String(e) })
    }
  }

  if (opts.format === "plain") {
    process.stdout.write(
      [
        `slug: ${opts.slug}`,
        ...checked.map((c) => `  ${c.provider.padEnd(11)} ${c.result}`),
        "",
        findings.length
          ? `Add to companies.json:  { "name": "${opts.slug}", "slug": "${opts.slug}", "provider": "${findings[0]!.provider}" }`
          : "No public ATS board found. The company may use a custom careers site or an unsupported ATS.",
      ].join("\n") + "\n",
    )
  } else {
    process.stdout.write(
      JSON.stringify(
        {
          slug: opts.slug,
          resolved: findings.length ? findings[0]!.provider : null,
          matches: findings,
          checked,
          registryEntry: findings.length
            ? { name: opts.slug, slug: opts.slug, provider: findings[0]!.provider }
            : null,
        },
        null,
        2,
      ) + "\n",
    )
  }

  if (findings.length === 0) {
    writeError(`No public ATS board found for "${opts.slug}".`, "UNRESOLVED")
    return 1
  }
  return 0
}
