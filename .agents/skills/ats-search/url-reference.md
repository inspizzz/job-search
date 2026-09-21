# ATS endpoint reference

All endpoints are public, keyless, and return JSON. Verified 2026-09-01.

## Greenhouse

```
https://boards-api.greenhouse.io/v1/boards/<slug>/jobs             # list
https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true # list with bodies
https://boards-api.greenhouse.io/v1/boards/<slug>/jobs/<id>         # one posting
```

Response: `{ "jobs": [ { id, title, updated_at, absolute_url, location: { name }, departments: [{ name }], content } ] }`

`content` is **HTML-entity-encoded** — decode entities before stripping tags or the markup
survives as literal text.

Board URLs look like `job-boards.greenhouse.io/<slug>/jobs/<id>` or
`job-boards.eu.greenhouse.io/<slug>/jobs/<id>` (EU-hosted boards).

## Lever

```
https://api.lever.co/v0/postings/<slug>?mode=json
```

Response: a bare JSON **array** of postings — `[ { id, text, createdAt, hostedUrl, categories: { location, team, department }, descriptionPlain } ]`

`createdAt` is epoch **milliseconds**, not an ISO string. `text` is the job title.

## Ashby

```
https://api.ashbyhq.com/posting-api/job-board/<slug>
https://api.ashbyhq.com/posting-api/job-board/<slug>?includeCompensation=true
```

Response: `{ "jobs": [ { id, title, location, publishedAt, jobUrl, department, team, isListed, descriptionHtml } ] }`

Filter on `isListed !== false`; unlisted drafts are included in the payload.

## Workable — not supported

```
POST https://apply.workable.com/api/v3/accounts/<slug>/jobs
```

Answers `POST` (a `GET` returns 404) with `{ total, results }`, but returns `total: 0` for
both real and nonexistent account slugs, so a slug cannot be verified as valid. Excluded
until that is resolved.

## Finding a company's slug

Open the company's careers page and look at where "Apply" links point. The slug is the path
segment after the ATS host. If the careers page is fully custom, check its network requests
for a call to one of the hosts above.
