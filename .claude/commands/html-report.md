# Generate a local application dashboard

Establish the active profile using `CLAUDE.md`. Run from the repository root:

```bash
python3 tools/application_state.py --profile <slug> report
```

This reads that profile's tracker and writes
`<profile>/reports/application-dashboard.html`. It is a self-contained offline
snapshot with status totals, deadlines, notes, posting links and a text filter.
All tracker text is escaped; links permit only HTTP(S). Nothing is uploaded.

Provide the resulting local file link and the number of applications. An empty
tracker produces an empty dashboard, not sample applications. Refresh after
`/apply` or `/outcome` changes the tracker. Do not publish this personal report
or move it into a tracked shared directory.
