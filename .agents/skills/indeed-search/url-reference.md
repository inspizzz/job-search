# Indeed UK — endpoint reference

Maintenance notes for `indeed-search`. Update this when Indeed changes its markup or blocking.

## Endpoints

| Purpose | Method | URL |
|---------|--------|-----|
| Search (SERP) | GET | `https://uk.indeed.com/jobs?q=<kw>&l=<loc>&fromage=<days>&start=<n>` |
| Job detail | GET | `https://uk.indeed.com/viewjob?jk=<jobkey>` |

Search params:
- `q` — keywords (maps to `--query`)
- `l` — location (maps to `--location`)
- `fromage` — posting age in days; Indeed effectively caps at ~14 (maps to `--jobage`)
- `start` — pagination offset in steps of 10 (`--page` → `(page-1)*10`)

There is **no** official anonymous API — the job data is embedded as JSON in the HTML.

## ⚠️ Transport: use `curl`, not `fetch`

Indeed is behind Cloudflare. `bun`/`fetch` is blocked with **HTTP 403** at the TLS-fingerprint
level (JA3/HTTP2), *regardless of the HTTP headers sent* — confirmed by testing minimal and full
Chrome client-hint header sets, both 403. The system **`curl`** binary is allowed through reliably
at low volume with just a browser `User-Agent` + `Accept-Language`. So `helpers.ts` shells out to
`curl` via `Bun.spawn` (`curlGet`). This keeps the package zero-*npm*-dependency.

A pasted `INDEED_COOKIE` (cf_clearance) is supported but unreliable: Cloudflare binds `cf_clearance`
to the solving client's TLS fingerprint, so a browser cookie may not validate from `curl`. Waiting
and retrying is usually the better remedy.

## SERP response structure

Job data lives in a JS assignment:

```
window.mosaic.providerData["mosaic-provider-jobcards"] = { "metaData": { "mosaicProviderJobCardsModel": { "results": [ … ] } } };
```

**Anchor carefully:** the bare string `"mosaic-provider-jobcards"` appears ~17× in the page (an HTML
`id=`, config lists, etc.). Only `providerData["mosaic-provider-jobcards"]=` (1 occurrence) precedes
the real JSON. `extractBalancedJson()` starts at that marker and brace-matches (respecting string
literals) to capture the ~200 KB object safely — a non-greedy regex would stop at the first `};`.

### Result fields used (`results[]`)

| Field | Maps to | Notes |
|-------|---------|-------|
| `jobkey` | `id` | 16-char hex |
| `displayTitle` / `title` | `title` | |
| `company` | `company` | |
| `formattedLocation` | `location` | |
| `formattedRelativeTime` | `date` | e.g. "Just posted", "13 days ago"; falls back to ISO from `pubDate`/`createDate` |
| `remoteLocation` (bool) | `remote` | **Use this only** — `remoteWorkModel` is an object (truthy even for hybrid/onsite) |
| `salarySnippet.text` / `extractedSalary` | `salary` | |

## viewjob (detail) response structure

Detail fields live in `window._initialData` as JSON-string values, extracted with
`extractInitialDataString()` (finds `"key":"` and reads to the matching unescaped quote, then
`JSON.parse`s to decode `<` etc.):

| Key | Maps to |
|-----|---------|
| `jobTitle` | `title` |
| `companyName` | `company` |
| `formattedLocation` | `location` |
| `sanitizedJobDescription` | `description` (HTML → text via `htmlToText`) |
| `jobTypes[0].label` (regex) | `jobType` |

## Challenge detection

`isCloudflareChallenge()` flags: a `<title>…Just a moment…</title>`, "verifying you are human",
turnstile/`cf_chl_opt` markers, or "enable javascript and cookies" without the data blob. A 403/429
from `curl` after retries also raises `CLOUDFLARE_CHALLENGE`. Note the normal data page *does* include
a `/cdn-cgi/challenge-platform/` script tag, so that alone is **not** used as a challenge signal.
