# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location.
     Replace the [PLACEHOLDER] tokens below. This file is a template — /setup and /expand
     can help populate it, or edit it by hand. -->

## Portal CLIs (preferred — structured results)

Run these zero-dependency `bun` scrapers from the repo root; they return JSON that is easy to
dedupe and present. Prefer them over `site:` WebSearch, and fall back to WebSearch if one errors.

```bash
# LinkedIn — global, pass your location (no key)
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "[ROLE]" -l "[City, Country]" --jobage 14 --format json

# Indeed — broad coverage (no key; via curl, best-effort behind Cloudflare). UK host by default.
bun run .agents/skills/indeed-search/cli/src/cli.ts search -q "[ROLE]" -l "[city]" --jobage 14 --format json

# Adzuna — official API, aggregates many boards (needs ADZUNA_APP_ID/KEY). UK (gb) by default.
bun run .agents/skills/adzuna-search/cli/src/cli.ts search -q "[ROLE]" -l "[city]" --jobage 14 --format json

# RemoteOK — global remote board (no key)
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "[ROLE]" --jobage 14 --format json

# WeWorkRemotely — global remote board (no key)
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q "[ROLE]" --jobage 14 --format json

# Company ATS boards — Greenhouse/Lever/Ashby (no key). Per-company, not market-wide:
# add your target employers with `resolve <slug>` first.
bun run .agents/skills/ats-search/cli/src/cli.ts search -q "[ROLE]" -l "[Country]" --jobage 14 --format json
bun run .agents/skills/ats-search/cli/src/cli.ts resolve [company-slug] --format plain

# jobs.ac.uk — UK academic and research posts (postdocs, research software engineers)
bun run .agents/skills/jobsacuk-search/cli/src/cli.ts search -q "[ROLE]" --format json
```

Notes:
- **Adzuna** needs a free key: `export ADZUNA_APP_ID=… ADZUNA_APP_KEY=…` (https://developer.adzuna.com/signup). Skip it if unset.
- **Indeed / Adzuna** default to the UK. To target another market: change `uk.indeed.com`/`VIEW_URL` in `indeed-search/cli/src/helpers.ts`, and `COUNTRY` in `adzuna-search/cli/src/helpers.ts`. Or run `/add-portal` to add a local job board.
- **Indeed** is best-effort (Cloudflare); on `CLOUDFLARE_CHALLENGE`, wait/retry or fall back to WebSearch/Adzuna.
- **RemoteOK / WeWorkRemotely** are remote-only and global — use for remote-friendly roles.
- **ats-search** needs no key but only covers companies in its registry — populate it with your target employers.
- **jobsacuk-search** is UK-only and academic/research-focused; skip it if that is not your market.

## Search Sites (WebSearch `site:` — for company pages & portals without a CLI)

- **linkedin.com/jobs** — filter by your city / region / Remote
- **indeed.com** (or your country's Indeed) — broad coverage
- Company career pages via Google `site:` searches (target companies below)

## Query Categories

Queries are grouped by priority. Combine each with your location term(s) where the site supports it.

### Priority 1: [YOUR PRIMARY ROLE FAMILY]

```
site:linkedin.com/jobs "[ROLE]" ([City] OR Remote)
site:linkedin.com/jobs "[RELATED ROLE]" [KEY SKILL]
"[ROLE]" OR "[RELATED ROLE]" jobs [City] Remote
```

### Priority 2: [YOUR SECONDARY ROLE FAMILY / DOMAIN]

```
"[DOMAIN KEYWORD]" OR "[DOMAIN KEYWORD]" jobs [City]
[TARGET COMPANY] OR [TARGET COMPANY] careers
site:linkedin.com/jobs [DOMAIN] "engineer" OR "specialist" Remote
```

### Priority 3: [WIDER NET — ADJACENT ROLES]

```
site:linkedin.com/jobs "[ADJACENT ROLE]" ([City] OR Remote)
"graduate [ROLE]" OR "junior [ROLE]" [City] Remote
```

## Location Filter

Acceptable locations:
- **[PRIMARY LOCATION]** — ideal
- **Remote / hybrid** — [ideal / acceptable]
- **[SECONDARY LOCATION]** — acceptable
- **Relocation** — [acceptable / not acceptable] for the right role
- Flag any hard deal-breakers (e.g. fully on-site with no flexibility)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Role-Fit Filters (hard)

Skip or flag postings that hit your deal-breakers (define these in your profile).

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and generate 2-3 custom queries for that focus.
