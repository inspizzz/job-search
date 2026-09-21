---
name: ats-search
version: 1.0.0
description: >
  Search company job boards directly through their ATS public APIs (Greenhouse, Lever, Ashby).
  Keyless and same-day: returns every opening at a named company the moment it is published,
  with no aggregator lag. Use when the user names target companies, or wants deep-tech/startup
  roles that market-wide boards index late. Trigger phrases: jobs at <company>, company careers,
  greenhouse, lever, ashby, ATS, target companies, startup jobs, who is hiring at.
context: fork
allowed-tools: Bash(bun run skills/ats-search/cli/src/cli.ts *)
---

# ATS Company Board Search Skill

Most startups and scale-ups publish their entire vacancy list as public JSON through their
applicant tracking system. This skill reads those endpoints directly — the same data the
company's own careers page renders, no key, no Cloudflare, no scraping.

**What it is good at:** depth on companies you name. Every opening, the day it goes live,
with the full description.

**What it is not:** a market-wide search. It only knows the companies in `cli/companies.json`.
Pair it with Adzuna or LinkedIn for breadth.

## Supported providers

| ATS | Endpoint | Verified |
|-----|----------|----------|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/<slug>/jobs` | yes |
| Lever | `api.lever.co/v0/postings/<slug>?mode=json` | yes |
| Ashby | `api.ashbyhq.com/posting-api/job-board/<slug>` | yes |

**Workable is deliberately not supported.** Its v3 endpoint answers `POST` with HTTP 200 but
returns `total: 0` for real and nonexistent accounts alike, so a slug cannot be verified. Add
it only once that is resolved.

## Commands

### Search

```bash
bun run skills/ats-search/cli/src/cli.ts search [flags]
```

| Flag | Meaning |
|------|---------|
| `--query`, `-q` | Keyword filter on title + department. All terms must match. |
| `--location`, `-l` | Substring filter on the posting's location. |
| `--company`, `-c` | Comma-separated slugs instead of the whole registry. |
| `--provider`, `-p` | Restrict to `greenhouse`, `lever` or `ashby`. |
| `--tag` | Only companies carrying this tag in `companies.json` (e.g. `quantum`). |
| `--jobage` | Posted/updated within N days. |
| `--limit`, `-n` | Cap results. |
| `--format` | `json` (default), `table`, `plain`. |

Results carry a `salary` field. **Only Ashby publishes pay structurally**, and only where the
employer opted in — in practice that means US roles under pay-transparency law. Greenhouse and
Lever expose no salary field at all (Greenhouse buries it in the description prose), so `salary`
is `null` for them rather than guessed. Measured on the current registry: 0 of 15 UK Ashby roles
carried pay, 1 of 60 Synthesia postings overall. The table only renders a SALARY column when at
least one result actually has one, and `meta.withSalary` counts them.

```bash
# Everything UK-side across the whole registry, last fortnight
bun run skills/ats-search/cli/src/cli.ts search -q engineer -l "United Kingdom" --jobage 14 --format table

# Just the quantum companies
bun run skills/ats-search/cli/src/cli.ts search --tag quantum --format table
```

### Detail

```bash
bun run skills/ats-search/cli/src/cli.ts detail <url | provider:id | id --company <slug>> [--format json|plain]
```

Accepts a board URL directly, so you can paste a link from a search result. Greenhouse bodies
arrive entity-encoded and are decoded to plain text.

### Resolve — how to add a company

```bash
bun run skills/ats-search/cli/src/cli.ts resolve <slug> --format plain
```

Probes all three providers and prints the `companies.json` entry to paste in. The slug is
normally the last path segment of the company's careers-page URL
(`job-boards.greenhouse.io/<slug>`, `jobs.lever.co/<slug>`, `jobs.ashbyhq.com/<slug>`).

**Known-unresolved** (careers pages use a custom or unidentified board — a slug guess returns
404 on all three): Quantinuum, Oxford Quantum Circuits, Phasecraft, Cortical Labs, Darktrace,
Arm, NVIDIA. Find the real slug from the careers page before adding these.

## Gotchas

- **`--jobage` is not comparable across providers.** Greenhouse exposes `updated_at` (last
  updated, not first posted), Lever `createdAt`, Ashby `publishedAt`. The CLI filters on
  whatever each gives; a Greenhouse result may be an old post that was recently edited.
- **Lever and Ashby boards are global.** Always pass `--location` for UK-only results.
- **Ashby returns unlisted postings**; those are filtered out via `isListed`.
- A 404 for one company is reported as a warning in `meta.errors` and the sweep continues.
  Exit code is 1 only if *every* company failed.
- Undated postings sort last rather than being treated as ancient, and are never dropped by
  `--jobage`.
