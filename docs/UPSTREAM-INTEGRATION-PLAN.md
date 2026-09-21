# Upstream integration plan

Source: [MadsLorentzen/ai-job-search at 120f476](https://github.com/MadsLorentzen/ai-job-search/tree/120f476a089358363ceaf2528f52edf2854994bd).
Compare against our clean initial snapshot, `7f1cb085a65a1b577f2a5ce60f103ba89261f647`.
Port selected source files and adapt their callers; do not merge or restore old Git history.

## Invariants

- Keep all seven UK/global portal integrations and UK defaults.
- Only `profiles/example/` is tracked. Candidate facts, search state, trackers,
  archives, form answers, interview packs and reports belong to one explicitly
  selected, ignored `profiles/<slug>/` directory. Never populate the example.
- Existing personal files are not migrated or rewritten during development.
- `.claude/` remains the workflow source. Codex entry points are thin adapters.
- Drafting does not mean submission. Follow-ups are drafts; external sends and
  account connections are outside this change.
- Imported code retains the upstream MIT license and attribution.

## Ordered implementation

1. **LinkedIn reliability.** Port nested-description parsing, Unicode decoding,
   closed-posting signals, timeouts, strict flags and freshness filters with
   upstream fixture tests. Preserve documented numeric-limit behaviour.
2. **Privacy and CI.** Test effective ignore behaviour and tracked-file boundaries,
   validate skill references, run portal typechecks and offline tests, and smoke
   compile blank templates. Keep live-service tests explicitly opt-in. Adapt checks
   to our layout rather than copying upstream's single-profile assumptions.
3. **PDF verification.** Port page/text and geometric layout helpers with unit
   tests. Wire them into both assistant workflows. Stock CV/letter page targets
   remain 2/1; active templates override them. Automated checks supplement actual
   inspection of every rendered page; unavailable checks are reported incomplete.
4. **Application lifecycle.** Port deterministic job keys and ranking state;
   require an explicit local profile for stateful CLIs. Add ranking, outcome,
   follow-up and interview workflows; record drafts and archive posting text.
   Add application-form guidance and an offline dashboard. Preserve existing CSV
   data, use safe archive names, distinguish failed retrieval from expired jobs,
   and adapt eligibility checks to actual UK role requirements.
5. **Integration and verification.** Add Codex adapters, update the scraper,
   upskill/setup/reset references and user docs, then exercise synthetic profiles,
   older tracker rows, invalid ranking data, profile boundaries and report output.

## Acceptance checks

- All changed CLI tests and typechecks pass without depending on live websites.
- A nested LinkedIn description retains later requirements; a closed banner is
  detected; unsupported/fractional flags fail rather than broadening a search.
- Tests reject tracked real profiles and ineffective ignore rules. Skills resolve
  to existing workflows and runtime discovery sees new Codex adapters.
- Rank/state operations cannot select the example, escape a profile, or default
  to another person's files. Failed validation leaves stored data unchanged.
- Existing tracker columns/rows survive updates; deadlines and draft/submitted
  states remain distinct. Reports escape untrusted text and remain local.
- PDF unit tests and blank-template compilation/text checks pass. Rendered smoke
  artifacts are inspected; synthetic placeholder layout findings are recorded.
- UK source constants are unchanged; personal-file checksums are unchanged;
  `git diff --check` passes and the candidate-data scan finds no exposure.

## Deferred

Freehire needs a separate contract check because the live API ignored some flags
in review. Gmail/Notion integrations require a separately chosen external-data
workflow. Danish portal additions are unnecessary for this UK workspace.

## Implementation status

Implementation complete. The port adds five workflows and their Codex adapters, the
profile-scoped tracker/report tool, ranking helpers, PDF checks, and CI.

Validation:

- 98 Python tests pass, covering imported helpers plus profile boundaries,
  all-or-nothing rank validation, legacy CSV handling, submission snapshots,
  repeat applications and report escaping.
- All seven portal typechecks pass. Offline Bun suites: 89 passed, 31 live
  service checks skipped by design. Live job availability was not re-tested.
- A synthetic CLI flow passed: candidate selection, ranking, draft creation,
  tracker-based exclusion, confirmed submission, document archive and report.
- Codex discovers 22 enabled repository skills (15 workflows, seven portals).
  All workflow adapter metadata and references validate.
- Blank CV and letter compile with LuaLaTeX/XeLaTeX to two pages/one page;
  page counts and text extraction pass. All three rendered pages were inspected.
  The geometric checker correctly flags the blank CV's mostly empty second page;
  this expected scaffold finding is not a waiver for real applications. The
  blank letter passes the geometric check.
- Privacy probes and known-identifier/credential scans pass. All 85 existing
  private-file checksums remain unchanged. No historical commits were imported.
- `git diff --check` passes. GitHub Actions runs privacy, Python, portal CLI and
  blank-template checks on every push and pull request.

Adaptations from upstream: state tools require an explicit ignored profile;
invalid ranking batches do not partially write; blocked retrieval is distinct
from expiry; missing eligibility facts remain flags; each application attempt
gets a separate archive; the dashboard is rendered deterministically with escaped
text. Existing personal documents were not migrated.

The tools expect one writer per profile at a time. Custom templates may require
layout-threshold calibration. External syncing and Freehire remain deferred as
specified above.
