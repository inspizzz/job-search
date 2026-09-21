# WeWorkRemotely — endpoint reference

Maintenance notes for `weworkremotely-search`. Update this when the feeds change shape.

## Endpoints

Category RSS feeds under `https://weworkremotely.com/categories/<slug>.rss`:

| Slug | Label | Approx items |
|------|-------|--------------|
| `remote-programming-jobs` | Programming | ~25 |
| `remote-full-stack-programming-jobs` | Full-Stack Programming | ~40 |
| `remote-back-end-programming-jobs` | Back-End Programming | ~14 |
| `remote-front-end-programming-jobs` | Front-End Programming | ~20 |
| `remote-devops-sysadmin-jobs` | DevOps / Sysadmin | ~21 |
| `remote-product-jobs` | Product | ~23 |

`search` (no `--category`) fetches all six in parallel, merges, and dedupes by slug.
`--category <slug>` fetches just one. There is a site-wide feed
`https://weworkremotely.com/remote-jobs.rss` (~100 mixed items) — not used, because the
category set gives deeper per-topic coverage.

`remote-jobs.rss` at the site root **301-redirects** — always use the `/categories/<slug>.rss` form.

Headers sent: browser `User-Agent` (Chrome/147 on Linux), `Accept: application/rss+xml`. No cookies.
There is **no** server-side query/date/region filter — all filtering is client-side.

## `<item>` structure

| RSS tag | Maps to | Notes |
|---------|---------|-------|
| `title` | `company` + `title` | Format is `Company: Role`; split on the first `": "` |
| `link` | `url` | canonical job URL |
| `guid` | (dedupe) | same as `link` |
| `pubDate` | `date` + `epoch` | RFC-822; parsed to unix seconds for `--jobage` |
| `region` | `location` | e.g. `Anywhere in the World`, `Europe Only`, `USA Only` |
| `category` | `category` | falls back to the feed's label |
| `type` | `type` | e.g. `Full-Time` |
| `description` | `description` (detail) | **full posting HTML**, entity-encoded (`&lt;p&gt;…`) |

## Parsing notes

- The `id` is the **slug** — the last path segment of the job URL (`slugFromUrl`). WWR exposes no numeric id in RSS.
- `description` is double-encoded: the HTML is delivered as entities. `descriptionToText()` decodes entities first (so `&lt;p&gt;` → `<p>`), then strips tags and re-decodes inner entities.
- Items are split on `<item>`/`</item>` and parsed independently so one malformed item can't break the feed.
- `tag()` handles both plain `<tag>…</tag>` and `<tag><![CDATA[…]]></tag>`.

## Quirks

- Region is free text; some region constraints (e.g. "EUROPE ONLY") also appear in the title.
- Feeds hold only recent postings; older roles fall off. Not exhaustive.
