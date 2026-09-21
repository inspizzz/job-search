# UK Job Endpoint Audit

Audit date: **2026-09-01**. Every endpoint below was probed live from this machine; the
status codes and payload shapes are measured, not quoted from documentation.

Tiers: **A** = keyless structured API, **B** = free-key API, **C** = scrapeable HTML,
**D** = gated or blocked.

## Currently wired up

| Portal | Tier | Auth | Status |
|--------|------|------|--------|
| LinkedIn | C | none | Working — country-agnostic, pass a UK location |
| Indeed UK | C | none | Working, best-effort behind Cloudflare |
| Adzuna GB | B | free key | **Live since 2026-09-02** — credentials in gitignored `.env` |
| RemoteOK | A | none | Working; thin index, global remote |
| WeWorkRemotely | A | none | Working; global remote |
| **Company ATS boards** | A | none | **Built 2026-09-01** — `ats-search` (Greenhouse, Lever, Ashby) |
| **jobs.ac.uk** | C | none | **Built 2026-09-01** — `jobsacuk-search` |

## Tier A — keyless structured APIs (highest value)

### ATS job boards — implemented as `ats-search`

Most startups and scale-ups publish their whole vacancy list as public JSON through their
applicant tracking system. No key, no Cloudflare, rich fields (title, location, team,
posted date, full description, apply URL).

```
https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true
https://api.lever.co/v0/postings/<slug>?mode=json
https://api.ashbyhq.com/posting-api/job-board/<slug>
https://apply.workable.com/api/v3/accounts/<slug>/jobs
```

Measured coverage — 15 target companies probed by slug:

| Company | ATS | Company | ATS |
|---------|-----|---------|-----|
| Riverlane | Greenhouse | Isomorphic Labs | Greenhouse |
| PsiQuantum | Greenhouse | Graphcore | Greenhouse |
| Wayve | Greenhouse + Ashby | DeepMind | Greenhouse |
| Monzo | Greenhouse | Stripe, Cloudflare | Greenhouse |
| Synthesia | Ashby | Improbable | Ashby |
| Palantir | Lever | | |

9 of 15 resolved on a first slug guess. Verified payload: `boards-api.greenhouse.io/v1/boards/riverlane/jobs`
returns 22 jobs, all Cambridge UK, with `title`, `location.name`, `updated_at`, `absolute_url`.

Misses (Quantinuum, OQC, Phasecraft, Cortical Labs, Darktrace, Arm, NVIDIA) are wrong-slug or
another ATS, not absence — the real slug is visible in the careers-page URL or its network calls.

**Implemented** as `.agents/skills/ats-search` with `search`, `detail` and `resolve` commands and
a checked-in company registry. Workable was probed and deliberately excluded: it answers POST with
HTTP 200 but returns `total: 0` for real and nonexistent accounts alike, so a slug cannot be
verified.

### Hacker News "Who is hiring"

```
https://hn.algolia.com/api/v1/search?query=...&tags=story
```
Keyless, verified working. Monthly thread; strong for AI/deep-tech startups, no UK filter
(filter client-side on "London", "UK", "Remote (UK)").

### Remotive

```
https://remotive.com/api/remote-jobs?search=engineer&limit=50
```
Keyless, verified (18 results for "engineer"). Remote-only, overlaps RemoteOK.

### Arbeitnow

```
https://www.arbeitnow.com/api/job-board-api
```
Keyless, verified: 175 jobs/page, 46 UK-ish. Heavily German-skewed — marginal for the UK.

## Tier B — free-key APIs

### Reed.co.uk

```
https://www.reed.co.uk/api/1.0/search?keywords=...&locationName=London&distanceFromLocation=15
https://www.reed.co.uk/api/1.0/jobs/<id>
```
Verified: returns **401** without a key, so the endpoint is live and key-gated. HTTP Basic auth,
API key as username with an empty password. Parameters: keywords, location, distance, salary
range, contract type, direct-employer vs agency, **graduate flag**, pagination to 100/page.
Reed is one of the largest UK boards. Sign up at reed.co.uk/developers.

### Adzuna GB — key installed 2026-09-02, working

Self-serve `app_id` **and** `app_key` — both are required (key alone returns HTTP 400; a wrong
id returns `AUTH_FAIL`). The published free-tier quota is not stated on the developer portal;
it is shown at signup. Credentials live in the gitignored repo-root `.env`, which `bun`
auto-loads.

**Measured value once live** — and it contradicted the prediction that Adzuna would be weak on
deep tech. A single "quantum computing" query returned 99 UK roles in 30 days including
**Quantinuum, Oxford Quantum Circuits, Quantum Motion, UKRI, Cambridge Consultants and
Classiq** — among them the two companies `ats-search` cannot reach because their ATS slugs
would not resolve. Adzuna indexes a posting regardless of which board hosts it, so it covers
exactly the gap the per-company ATS registry structurally cannot.

Also confirmed: 15 of 25 salaries on a sample query were employer-stated, 10 Adzuna-predicted
(flagged by `salary_is_predicted`); and `/jobs/gb/histogram` returns a real salary distribution
(ML Engineer, London: 105 of 139 vacancies at £70k+).

Caveats: sorting by date surfaces training-course adverts sold as jobs ("AI Engineer Placement
Programme, No Experience") and agency reposts, so `/scrape` needs to filter recruiter bait. And
the `top_companies` endpoint returns `average_salary: 0` for every entry, so it cannot populate
`salary_lookup.py` — that tool wants per-company data and stays without a source.

## Tier C — scrapeable HTML

### jobs.ac.uk — implemented as `jobsacuk-search`

```
https://www.jobs.ac.uk/search/?keywords=quantum
```
Verified: HTTP 200, no Cloudflare, **25 parseable results** for "quantum" with clean
`/job/<ID>/<slug>` links. UK academic and research posts — postdocs, research software
engineers, quantum/neurotech lab roles. No RSS: the advertised `/feeds/...` paths 404 and the
site publishes no feed auto-discovery, so this is an HTML scrape. `robots.txt` permits `/search/`
and `/job/`.

**Implemented** as `.agents/skills/jobsacuk-search`. Two findings shaped the design: the site
*silently ignores* a `location=` parameter (identical results with and without it), so `--location`
filters client-side; and search cards print no year on their dates, so there is no `--jobage` —
but each advert page carries a schema.org `JobPosting` JSON-LD block with real ISO dates, structured
salary and the full description, which `detail` reads instead of scraping markup.

### Civil Service Jobs

`civilservicejobs.service.gov.uk` returns 200 but the search is session-bound (`SID` in the
query string); a naive fetch yields zero job boxes. Scrapeable only with cookie/session handling.

## Tier D — gated or blocked

| Site | Result |
|------|--------|
| CV-Library | 403 (Cloudflare) — reachable via Adzuna instead |
| Totaljobs | connection refused to non-browser clients |
| Wellfound | 403 (Cloudflare) |
| Gradcracker | 403 (Cloudflare) — relevant for graduate schemes, but blocked |
| Bright Network | 403 (Cloudflare) |
| DWP Find a job | 503 / connection refused; no usable feed found |
| Otta / Welcome to the Jungle | login-gated |

## Status and remaining work

**Done (2026-09-01):** `ats-search` and `jobsacuk-search` are built, tested against live
endpoints, and wired into `/scrape`.

**Adzuna is live** (2026-09-02), so all three configured channels now work.

**Optional next:**

1. Resolve the ATS slugs for Quantinuum, OQC, Phasecraft and Cortical Labs from their careers
   pages, then `ats-search resolve <slug>` and add them to `companies.json`. Adzuna confirms all
   of these are actively hiring, so the gap is now known-nonempty. Note that Adzuna's
   `redirect_url` is a click-through landing page, not a direct redirect, so it does not hand
   over the ATS slug — the careers page still has to be read.
2. Filter recruiter bait out of `/scrape`: training-course adverts ("Placement Programme, No
   Experience") and agency reposts dominate date-sorted Adzuna results.
3. Fold the HN Algolia "who is hiring" query into `/scrape` as a monthly sweep.
4. A Reed CLI, but only if Adzuna's aggregation proves to miss it in practice — check that first.
