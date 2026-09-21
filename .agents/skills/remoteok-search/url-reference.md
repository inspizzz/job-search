# RemoteOK — endpoint reference

Maintenance notes for `remoteok-search`. Update this when the feed shape changes.

## Endpoint

| Purpose | Method | URL |
|---------|--------|-----|
| Full job feed | GET | `https://remoteok.com/api` |

There is **one** public endpoint. It returns the whole feed as a JSON array; there is no
server-side keyword/location/date query. All filtering (`--query`, `--location`, `--jobage`,
`--page`, `--limit`) is done client-side in `search.ts`/`helpers.ts`.

Headers sent: browser `User-Agent` (Chrome/147 on Linux), `Accept: application/json`. No cookies.

## Response structure

Top level is a JSON **array**:

- **Element `[0]`** — a legal/metadata object: `{ "last_updated": ..., "legal": ... }`. It has
  **no `position` field**, which is how `parseFeed()` (`isJob`) drops it.
- **Elements `[1..]`** — job objects.

### Job object fields (the ones the CLI uses)

| Field | Maps to | Notes |
|-------|---------|-------|
| `id` | `id` | numeric string |
| `slug` | (detail lookup) | e.g. `remote-…-1134578` |
| `position` | `title` | the clean keyword-match signal |
| `company` | `company` | |
| `location` | `location` | free text; often a city/region, sometimes empty → defaulted to `"Remote"` |
| `date` | `date` | ISO 8601 string |
| `epoch` | (jobage filter) | unix seconds; used for `--jobage` |
| `url` | `url` | source casing is `remoteOK.com` — normalised to `remoteok.com` |
| `apply_url` | `applyUrl` | |
| `tags` | `tags` | **generic soup** — NOT used for query matching |
| `description` | `description` (detail) | HTML; converted to text with `htmlToText()` |
| `salary_min` / `salary_max` | `salary` | formatted as `$min – $max` when present |

## Quirks

- **Tag pollution:** a single posting can carry 40+ tags (`engineer`, `dev`, `designer`, …), so
  matching `--query` against tags returns wildly irrelevant results. Query matches title+company only.
- **Feed size:** ~100 most recent postings only. Not exhaustive; older roles fall off.
- **US-heavy:** listings skew US; use `--location` loosely and treat as a remote supplement.
- **URL casing:** the API returns `https://remoteOK.com/...`; normalised to lowercase host.
