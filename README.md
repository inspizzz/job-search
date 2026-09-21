<p align="center">
  <img src="claude_animation.gif" alt="Claude Job Search Assistant" width="200">
</p>

# AI Job Search

An AI-powered job application framework for [Claude Code](https://claude.com/claude-code) and [Codex](https://developers.openai.com/codex/). Fork it, fill in your profile, and use either assistant to evaluate job postings, tailor your CV, write cover letters, and prepare you for interviews.

<p align="center">
  <a href="https://ko-fi.com/madslorentzen">
    <img src="https://storage.ko-fi.com/cdn/kofi3.png?v=6" alt="Buy me a coffee at ko-fi.com" height="40">
  </a>
</p>

## What this is

A structured workflow that turns Claude Code or Codex into a job application assistant. The core workflow (self-profiling, fit evaluation, and the drafter-reviewer application pipeline) is **language- and country-agnostic**. The job portal search skills are built for the UK market (LinkedIn, Indeed UK, Adzuna GB, company ATS boards, jobs.ac.uk) plus two global remote boards, and the pattern is designed to be swapped for your local job boards.

```
/setup          /scrape              /apply <url>
  |                |                     |
  v                v                     v
Fill in        Search job           Evaluate fit
your profile   portals              Score & recommend
  |                |                     |
  v                v                     v
Profile        Present matches      Draft CV + Cover Letter
files ready    with fit ratings     (LaTeX, tailored)
                   |                     |
                   v                     v
               Pick a match         Reviewer agent critiques
               -> /apply            -> Revise -> Final output
```

The framework encodes career guidance best practices, including structured evaluation criteria, forward-looking cover letter framing, and optional salary benchmarking.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) or [Codex](https://developers.openai.com/codex/) (CLI or app)
- Python 3.10+
- [Bun](https://bun.sh) (for the job search CLI tools)
- LaTeX distribution with `lualatex` and `xelatex`: [TeX Live](https://tug.org/texlive/) or [MiKTeX](https://miktex.org/). The CV compiles with `lualatex` (pdflatex often fails on modern MiKTeX installs with `fontawesome5` font-expansion errors); the cover letter compiles with `xelatex` because `cover.cls` requires `fontspec`.
- Optional: `pdftotext` from [poppler](https://poppler.freedesktop.org/) (macOS: `brew install poppler`, Debian/Ubuntu: `apt install poppler-utils`, Windows: `choco install poppler`) — used by `/apply`'s ATS parseability check on the compiled CV. If missing, the check degrades gracefully to a visual keyword review.

## Personal data

Only the blank `profiles/example/` scaffold belongs in Git. Create a separate
local profile for each person; its entire directory is ignored, including CV
sources and contact details. Names are discovered from local manifests and never
stored in a shared roster. See [profiles/README.md](profiles/README.md).

## Quick start

**Using Codex:** launch `codex` from the repository root, then use
`$job-profile --new my-profile`, `$job-setup`, `$job-scraper`, and
`$job-apply <posting URL or text>` in the conversation. The slash commands below
are the Claude Code spelling of the same workflows. See [the Codex guide](docs/CODEX.md)
for the complete command map and PDF verification setup.

### 1. Fork and clone

```bash
gh repo fork MadsLorentzen/ai-job-search --clone
cd ai-job-search
```

### 2. Install job search tools

```bash
cd .agents/skills/indeed-search/cli && bun install && cd ../../../..
cd .agents/skills/ats-search/cli && bun install && cd ../../../..
cd .agents/skills/jobsacuk-search/cli && bun install && cd ../../../..
cd .agents/skills/adzuna-search/cli && bun install && cd ../../../..
cd .agents/skills/remoteok-search/cli && bun install && cd ../../../..
cd .agents/skills/weworkremotely-search/cli && bun install && cd ../../../..
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
```

For `linkedin-search` the install is optional: it has zero runtime dependencies and runs with plain `bun`; `bun install` only pulls TypeScript dev types.

### 3. Set up your profile

```bash
claude
# Then inside Claude Code:
/profile --new my-profile
/setup
```

`/setup` offers three paths: read your `documents/` folder if you have one populated (CV PDF, LinkedIn export, diplomas, reference letters, past applications), import a single CV pasted in chat, or walk through an interview. It auto-detects what you have and asks. Documents-folder mode is idempotent and safe to re-run as you add more material; see `profiles/<slug>/documents/README.md` for the layout.

### 4. Search for jobs

```bash
/scrape
```

This searches multiple job portals for positions matching your profile, deduplicates results, and presents them sorted by fit. Pick a match to run `/apply` on it directly.

### 5. Apply to a job

```bash
/apply https://uk.indeed.com/viewjob?jk=1234567abcdef
```

If the URL can't be fetched (some job portals block automated access), you can paste the job description directly instead:

```bash
/apply <paste the full job description here>
```

This runs the full workflow: evaluate fit, draft CV + cover letter, review with a second agent, revise, and present the final output.

## Other commands

`/setup`, `/scrape`, and `/apply` form the core workflow. Four more commands extend it once your profile is in place:

- **`/expand`** enriches your profile by scanning public sources you've already linked in it (GitHub repos, portfolio site, Kaggle, Google Scholar) and looking up syllabi for named courses and certifications. Discovered competencies are added to your profile with a source tag. Useful right after `/setup` to surface skills that documents alone don't make explicit.
- **`/upskill`** analyzes the gap between your profile and your tracked job postings (or a single posting via `/upskill <URL>`). Produces a prioritized heatmap of skill gaps and a learning plan with web-searched study resources and time estimates. Useful for career planning between applications.
- **`/add-template`** registers your own LaTeX CV or cover letter template in place of the stock ones. It captures the template's instructions (compile engine, fonts, style rules, page limit), runs a mandatory test compile, and wires the template into `/apply`. See [LaTeX templates](#latex-templates) below.
- **`/add-portal`** generates a job-portal search skill for a job board in your market. It investigates the portal (search URL pattern, result structure, access rules), scaffolds the CLI skill from the same structure as the shipped ones, and test-runs a live query before registering. See [Job search tools](#job-search-tools) below.

`/reset` is also available, see [Starting over](#starting-over) below.

## File structure

This workspace is **multi-profile**: it serves more than one job seeker. Everything
person-specific lives under `profiles/<slug>/`; everything at the root is shared tooling.

```
ai-job-search/
├── CLAUDE.md                          # Profile routing rules + workflow + verification checklist
├── profiles/                          # ALL person-specific data lives here
│   ├── README.md                      # Profile layout, roster, how to add one
│   ├── example/                       # Blank, tracked scaffold; never populate
│   │   ├── PROFILE.md                 # Manifest: display name, market, status
│   │   ├── profile/
│   │   │   ├── 00-summary.md          # At-a-glance candidate summary
│   │   │   ├── 01-candidate-profile.md # Education, experience, skills
│   │   │   ├── 02-behavioral-profile.md# Behavioral traits and environments
│   │   │   ├── 03-cv-statements.md    # Role-specific CV profile statements
│   │   │   ├── 04-job-evaluation.md   # Fit-scoring calibration
│   │   │   ├── 07-interview-prep.md   # STAR examples + interview material
│   │   │   └── search-queries.md      # /scrape queries, targets, location filters
│   │   ├── cv/                        # main_example.tex + tailored main_<company>.tex
│   │   ├── cover_letters/             # cover.cls, OpenFonts/, cover_<company>_<role>.tex
│   │   ├── documents/                 # Source materials for /setup Path A and /expand
│   │   │   ├── cv/ linkedin/ diplomas/ references/ applications/
│   │   ├── job_scraper/seen_jobs.json # Scraper dedupe state
│   │   ├── job_search_tracker.csv     # Application tracker
│   │   └── upskill/                   # /upskill reports
│   └── <local-slug>/                  # Real profiles are local-only and gitignored
│       └── (same layout)
├── .claude/
│   ├── commands/
│   │   ├── profile.md                 # /profile select, inspect, or create a profile
│   │   ├── apply.md                   # /apply workflow (drafter-reviewer)
│   │   ├── setup.md                   # /setup onboarding (documents folder, CV import, or interview)
│   │   ├── expand.md                  # /expand competency enrichment from documents and online presence
│   │   ├── add-template.md            # /add-template register custom LaTeX templates
│   │   ├── add-portal.md              # /add-portal generate a job-portal search skill for your market
│   │   └── reset.md                   # /reset wipe profile data or documents folder
│   ├── skills/
│   │   ├── job-application-assistant/  # Core application skill (profile-agnostic)
│   │   │   ├── SKILL.md               # Skill definition + profile routing
│   │   │   ├── 03-writing-style.md    # Tone, structure, do's and don'ts
│   │   │   ├── 05-cv-templates.md     # LaTeX CV structure + tailoring rules
│   │   │   └── 06-cover-letter-templates.md # LaTeX cover letter templates
│   │   ├── job-scraper/               # Job search orchestration
│   │   └── upskill/                   # /upskill skill gap analysis and learning plan
│   └── settings.json                  # Claude Code permissions (shared, scoped)
├── AGENTS.md                          # Codex instructions and Claude tool adaptations
├── .codex/config.toml                 # Live web search for current job information
├── .agents/skills/                    # Codex workflow adapters and shared portal CLIs
│   ├── job-*/                         # Profile, setup, apply, search, learning, maintenance
│   ├── linkedin-search/               # LinkedIn public job listings (country-agnostic)
│   ├── indeed-search/                 # Indeed (hard-configured for uk.indeed.com)
│   ├── adzuna-search/                 # Adzuna API (hard-configured for country "gb")
│   ├── ats-search/                    # Company ATS boards: Greenhouse, Lever, Ashby (keyless)
│   ├── jobsacuk-search/               # jobs.ac.uk — UK academic and research posts
│   ├── remoteok-search/               # RemoteOK (global remote)
│   └── weworkremotely-search/         # WeWorkRemotely (global remote)
├── templates/                         # Custom templates registered via /add-template
├── salary_lookup.py                   # Salary benchmarking tool (BYO data)
├── tools/                             # Salary tool helpers
└── SETUP.md                           # Detailed setup guide
```

### Profile routing

Neither assistant keeps a persisted "active profile" — a stale pointer would silently write one
person's cover letter into the other's directory. Instead, at the first job-search action of a
session (scrape, fit evaluation, CV, cover letter, interview prep, `/upskill`, `/setup`), it asks
who the session is for, loads that profile's files, and keeps every read and write inside
`profiles/<slug>/` for the rest of the session. Development work on the workspace itself
(editing skills, CLIs, commands, docs, git) needs no profile and is not interrupted by the question.

Use `/profile` to pick or switch explicitly, `/profile --list` to see the roster, and
`/profile --new <slug>` to scaffold another person.

## How `/apply` works

The `/apply` command runs a **drafter-reviewer workflow** with mandatory PDF compilation:

1. **Parse** the job posting (URL or text)
2. **Evaluate fit** against your profile (skills, experience, culture, location, career alignment)
3. **Draft** a tailored CV and cover letter in LaTeX
4. **Spawn a reviewer agent** that researches the company and critiques the drafts
5. **Revise** based on the reviewer's feedback
6. **Compile and inspect** both PDFs: lualatex for the CV, xelatex for the cover letter. Claude reads the rendered pages and iterates on the LaTeX until the CV is exactly 2 pages with no orphaned entry titles, and the cover letter is exactly 1 page with the signature visible and fonts consistent.
7. **ATS-check the CV**: extract the PDF's text layer (`pdftotext`, optional dependency) and verify it the way an ATS parser sees it — contact details present as literal text, no garbled glyphs, sane reading order — then score the posting's keyword coverage against the extraction. Keywords the profile genuinely supports get added; genuine gaps stay visible, never stuffed.
8. **Present** the final output with a verification checklist

All claims in the CV and cover letter are verified against your actual profile. The system never fabricates skills or experience.

### What makes this workflow different

- **PDF verification loop.** Most LaTeX-resume templates produce "looks fine in the .tex" output that breaks in the PDF: job titles orphan to the next page, cover letters spill onto page 2, bullet fonts silently fall back to the body font. The `/apply` command compiles and visually inspects every PDF and applies targeted fixes (`\needspace`, `\enlargethispage`, font-matching wrappers for list items) until the layout is clean. This runs automatically on every application.
- **ATS verification on the PDF text layer.** An ATS reads the PDF's embedded text, not the rendered page — and LaTeX can silently produce PDFs whose text extracts as garbage (icon glyphs where the email should be, interleaved lines from multi-column layouts). `/apply` extracts the compiled CV's text layer with `pdftotext` and verifies contact details, reading order, and the posting's keyword coverage against what a parser actually sees. Honesty rule enforced: a keyword the profile doesn't support is acknowledged as a gap, never stuffed in.
- **Relevance-weighted CV cutting.** When a CV overflows 2 pages, the workflow does not cut mechanically from the "oldest" section. It scores each candidate line by (a) relevance to the target posting, (b) uniqueness in the document, and (c) whether the cover letter depends on it, and cuts the lowest-total-score line first. An older-role bullet that hits posting keywords survives ahead of a recent-role bullet that does not.
- **Drafter-reviewer separation.** The drafter writes; a second Claude agent, spawned with a fresh context, researches the company and critiques the drafts. The drafter then revises. This catches missed keywords, weak framing, and generic language that a single pass often leaves in.
- **Token-efficient reviewer dispatch.** The reviewer agent receives drafts inline rather than re-reading them, and the verification checklist runs once at the end of the workflow rather than being duplicated by both agents. Note: the new compile-and-inspect step in Step 5 spends some of those savings on PDF rendering and layout iteration — the workflow trades some end-to-end token cost for a real reduction in broken PDFs reaching the user.

## Customization

### Which files to edit manually

If you prefer editing files directly instead of using `/setup`:

| File | What to change |
|------|---------------|
| `profiles/<slug>/profile/00-summary.md` | That person's full profile (name, education, experience, skills, goals) |
| `01-candidate-profile.md` | Structured version of your CV data |
| `02-behavioral-profile.md` | Your behavioral assessment or self-assessment |
| `04-job-evaluation.md` | Skill match areas, career goals, motivation filters |
| `profiles/<slug>/profile/03-cv-statements.md` | Personal profile statements for different role types |
| `.claude/skills/job-application-assistant/05-cv-templates.md` | Shared CV formatting and LaTeX guidance |
| `07-interview-prep.md` | Your STAR examples from actual experience |
| `profiles/<slug>/profile/search-queries.md` | Job search queries for that person's skills and location |

### Updating your search queries

As your priorities evolve, you can reconfigure just the job search without re-running the full profile setup:

```
/setup --section search
```

This re-runs the search configuration interview: which roles to target, which skills to search for, which locations, and which portals. It also suggests role types you may not have considered based on your profile.

### LaTeX templates

The CV uses [moderncv](https://ctan.org/pkg/moderncv) (banking style). The cover letter uses a custom `cover.cls` with Lato/Raleway fonts.

To use your own template instead, run:

```
/add-template
```

Point it at your `.tex` file (plus any `.cls`/`.sty` files or bundled fonts). The command interviews you for the template's instructions — compile engine, fonts and where they live, style rules to preserve, hard page limit — stores everything under `templates/`, runs a mandatory test compile, and activates the template so `/apply` drafts from it. Templates are stored with `[PLACEHOLDER]` tokens instead of personal data, so they're safe to commit and share.

- `/add-template --list` shows registered templates
- `/add-template --use <name>` switches between them
- `/add-template --use default` reverts to the stock moderncv / cover.cls templates

If you prefer doing it by hand, the manual route still works: update the guidance in `05-cv-templates.md` and `06-cover-letter-templates.md`.

### Job search tools

The CLI tools in `.agents/skills/` demonstrate the pattern for building a job-portal integration for a specific market. If you're outside the UK, run:

```
/add-portal
```

Give it your local job board's URL. The command investigates the portal (search-URL pattern, result-page structure, robots.txt/access rules), scaffolds a CLI skill with the same structure, commands, and output contract as the shipped ones, and test-runs a live query before registering anything. Auth-walled portals are declined, and portals with restrictive terms get a prominent personal-use-only warning in the generated skill. The generated skill is market-specific and lives in your fork; the generator itself is the universal part.

For a **country-agnostic** starting point, the repo also includes **`linkedin-search`** — a job-search skill built on LinkedIn's public, unauthenticated `jobs-guest` endpoints. It is field-agnostic, has **zero runtime dependencies** (runs with just `bun`), and takes the search location as an explicit flag, so it works for any market out of the box (`-l "Berlin, Germany"`, `-l "Mumbai, Maharashtra, India"`, `-l "Remote"`, …). It is intended for **personal use only** — automated access is against LinkedIn's Terms of Service, so keep volume low. See `.agents/skills/linkedin-search/SKILL.md`.

### Salary benchmarking

The salary tool works with any salary data you provide (union statistics, Glassdoor exports, personal research, etc.). See `tools/README_SALARY_TOOL.md` for the expected format and setup. If you don't have salary data, the salary step is simply skipped.

### Starting over

To wipe your profile data and start fresh:

```
/reset profile    # clears skill files, preserves framework rules
/reset documents  # deletes files from the active profile's documents/ folder
/reset all        # both
```

`/reset` shows exactly what will be deleted and requires you to type `RESET` to confirm. Nothing is deleted until you do.

## Tips for better results

### Profile depth matters

The single biggest factor in output quality is how much detail you put into your profile. A thin profile produces generic applications; a detailed one enables genuinely tailored results.

- **Role descriptions:** Don't just list job titles. Describe what you actually did in each position: specific projects, tools used, responsibilities, and measurable achievements. The more material you provide, the more precisely the system can reframe your experience for different roles.
- **Skills in context:** Instead of listing "Python" or "project management," describe how and where you applied them. "Built ML pipelines for customer churn prediction in Python using scikit-learn" gives the system far more to work with than "Python, machine learning."
- **All onboarding paths work:** Whether you point `/setup` at your `documents/` folder, paste a single CV, or walk through the interview, the principle is the same: richer input produces sharper output.

### Career path discovery

The framework supports two distinct modes of job searching:

- **Explicit targeting:** You know which roles or sectors you want. The system helps refine and prioritize based on fit.
- **Latent opportunity discovery:** By analyzing your full history (not just job titles, but the actual work you did), the system can surface career paths you haven't considered. Transferable skills that map to unexpected industries, patterns in what you enjoyed or excelled at, or emerging roles that combine your domain expertise with new technology.

To get the most from this, invest time during `/setup` in describing not just your experience, but what energized you, what drained you, and what you'd want more of. This context directly shapes how the system evaluates fit and which roles it surfaces during `/scrape`.

## Acknowledgements

- [Mikkel Krogholm](https://github.com/mikkelkrogsholm) ([skills repo](https://github.com/mikkelkrogsholm/skills)) for the job search CLI skills
- Built with [Claude Code](https://claude.com/claude-code) by [Anthropic](https://anthropic.com)

## License

MIT
