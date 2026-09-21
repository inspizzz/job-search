# Adzuna — endpoint reference

Maintenance notes for `adzuna-search`. Update this if Adzuna changes the API or details-page markup.

## Authentication

Free credentials from https://developer.adzuna.com/signup, passed as query params on every call:
`app_id` (from `ADZUNA_APP_ID`) and `app_key` (from `ADZUNA_APP_KEY`). No OAuth. Free tier is
rate-limited (a few hundred calls/day). A 401/403 means bad/'' credentials.

## Search endpoint (official API)

```
GET https://api.adzuna.com/v1/api/jobs/gb/search/{page}
      ?app_id=…&app_key=…&content-type=application/json
      &results_per_page=<1..50>&what=<kw>&where=<loc>
      &max_days_old=<days>&distance=<km>&sort_by=date
```

- `{page}` is a **path** segment, 1-indexed (not a query param).
- Country segment `gb` = United Kingdom (`COUNTRY` in `helpers.ts`).
- `api.adzuna.com` is a plain JSON API — `fetch` works (no Cloudflare fingerprint issue, unlike the
  `www.adzuna.co.uk` website). Uses `jsonFetch` with 429/5xx backoff.

### Response → result mapping (`results[]`)

| API field | Maps to | Notes |
|-----------|---------|-------|
| `id` | `id` | numeric string |
| `title` | `title` | may contain `<strong>` highlights → tags stripped |
| `company.display_name` | `company` | |
| `location.display_name` | `location` | |
| `created` | `date` | ISO 8601 |
| `salary_min` / `salary_max` | `salary` | formatted `£min – £max`; Adzuna normalises across sources |
| `contract_time` / `contract_type` | `contract` | e.g. `full_time`, `permanent` → "full time, permanent" |
| `category.label` | `category` | |
| `redirect_url` | `url` | Adzuna redirect to the source posting |
| `description` | (snippet) | truncated snippet; full text via the details page (see below) |

Top-level `count` → `meta.total`.

## Detail (public details page — no API endpoint)

The Jobs API has **no by-id detail endpoint**; search results already carry everything except the
full description. `detail` therefore fetches the public details page and reads schema.org JSON-LD:

```
GET https://www.adzuna.co.uk/details/<id>
```

- Fetched via **`curl`** (`Bun.spawn`) — the `www` site can block non-browser TLS fingerprints. `curl`
  is a system tool, not an npm dependency.
- Parses `<script type="application/ld+json">` blocks for a `@type: JobPosting` (also checks `@graph`),
  reading `title`, `hiringOrganization.name`, `jobLocation.address.*`, `datePosted`, `description`.
- Non-200 → `DETAIL_UNAVAILABLE` with the URL to open; unparseable → `PARSE_FAILED`.
- Accepts a bare numeric id, an `adzuna.*/details/<id>` or `/jobs/land/ad/<id>` URL, or any `http(s)` URL.

## Quirks

- The website (`www.adzuna.co.uk`) rate-limits aggressively (429) — the API host does not; prefer the API.
- `results_per_page` is capped at 50 by Adzuna.
