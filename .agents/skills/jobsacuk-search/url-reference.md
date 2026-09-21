# jobs.ac.uk URL reference

Verified 2026-09-01.

## Search

```
https://www.jobs.ac.uk/search/?keywords=<terms>&pageSize=25&startIndex=<n>&sortOrder=1
```

| Parameter | Notes |
|-----------|-------|
| `keywords` | Free text. The only filter the site actually honours. |
| `pageSize` | 25 per page. |
| `startIndex` | **1-based advert offset, not a page number.** Page 2 is `startIndex=26`. |
| `sortOrder` | `1` = most recent first, `0` = relevance. |
| `location` | **Ignored.** Passing it returns identical results — filter client-side. |

## Result card markup

```html
<div class="j-search-result__result" data-advert-id="1085716">
  <a href="/job/DSR541/pdra-in-theoretical-quantum-science">Title</a>
  <div class="j-search-result__department">Department of Physics</div>
  <div class="j-search-result__employer"><b>University of Strathclyde</b></div>
  <div>Location: Glasgow</div>
  <div class="j-search-result__info"><strong>Salary: </strong>£37,694 to £46,049</div>
  <div><strong>Date Placed: </strong>21 Aug</div>
  <span class="... j-search-result__date--blue">21 Oct</span>   <!-- closing date -->
</div>
```

`data-advert-id` is the stable numeric key. The `/job/<REF>/` code (e.g. `DSR541`) is what
detail URLs use.

## Advert page

```
https://www.jobs.ac.uk/job/<REF>/<slug>
https://www.jobs.ac.uk/job/<REF>/            # slug optional — redirects to canonical
```

Every advert page embeds a schema.org `JobPosting` block:

```html
<script type="application/ld+json">
{ "@type": "JobPosting", "title": ..., "description": "<p>...", "datePosted": "2026-08-21T00:00:00+00:00",
  "validThrough": ..., "employmentType": "Full Time,Fixed-Term/Contract",
  "hiringOrganization": { "name": ... }, "jobLocation": [{ "address": { "addressLocality": ... } }],
  "baseSalary": { "currency": "GBP", "value": { "minValue": ..., "maxValue": ..., "unitText": "YEAR" } } }
</script>
```

**Prefer the JSON-LD over the rendered markup** — it carries ISO dates, structured salary and
location, and the full description, and is far more stable. The visible details table
(`<th>Label:</th><td>Value</td>`) fills the gaps (Department, Hours).

## robots.txt

```
User-agent: *
Disallow: /job/feedback/
Disallow: /enhanced/fp/
```

`/search/` and `/job/` are permitted.
