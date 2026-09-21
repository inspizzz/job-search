# Profile: Example

| Field | Value |
|-------|-------|
| **Slug** | `example` |
| **Display name** | Example |
| **Status** | Template only — copy to a new local profile before onboarding |
| **Market** | Not set — the shared Indeed/Adzuna CLIs are hard-configured for the UK (`uk.indeed.com`, Adzuna `gb`) |
| **Profile root** | `profiles/example/` |

## Contents

| Path | What it holds |
|------|---------------|
| `profile/01-candidate-profile.md` | Education, experience, skills, publications, awards |
| `profile/02-behavioral-profile.md` | Behavioral traits, strengths, ideal environments |
| `profile/04-job-evaluation.md` | Fit-scoring calibration (strong/weak areas, career goals, deal-breakers) |
| `profile/07-interview-prep.md` | STAR examples and interview material |
| `profile/search-queries.md` | Job-scraper queries, target companies, location filters |
| `cv/main_example.tex` | Master CV; tailored CVs land here as `main_<company>.tex` |
| `cover_letters/` | `cover.cls` + `OpenFonts/`; letters land here as `cover_<company>_<role>.tex` |
| `documents/` | Source materials (CV PDFs, LinkedIn export, diplomas, references) |
| `job_scraper/seen_jobs.json` | Scraper dedupe state |
| `job_search_tracker.csv` | Application tracker |
| `upskill/` | `/upskill` learning-plan output |
