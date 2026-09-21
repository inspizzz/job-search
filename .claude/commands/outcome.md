# Record an application outcome or prepare a follow-up

Establish the active profile and load its references per `CLAUDE.md`. Read the
shared state contract in `../../docs/APPLICATION-STATE.md`. This workflow records
the user's application history; it never submits an application or sends a message.

## Choose the application

Run `python3 tools/application_state.py --profile <slug> list` from the repository
root. Match the requested company/role; if several rows match, ask which numbered
row. Do not silently pick between repeat applications. With no argument, show open
rows and ask which to update. Read the selected row's `archive` directory for the
posting, submitted documents and `outcome.md`; older rows may not have an archive.

## Record a result

Use only the outcome the user reports. An explicit update is authorization to
record it. Ask for missing stage/date details when necessary; do not infer an
offer was accepted or that silence means rejection.

```bash
python3 tools/application_state.py --profile <slug> outcome --row 1 --status interview --note "Interview invitation received"
```

Statuses: `drafted`, `applied`, `screening`, `assessment`, `interview`, `offer`,
`hired`, `rejected`, `withdrawn`, `no_response`, `offer_declined`. Final statuses
are `hired`, `rejected`, `withdrawn`, `no_response` and `offer_declined`; legacy space spellings are read equivalently.
`drafted` means the user has not confirmed submission. On the first confirmed
submission or employer response, the tool snapshots available CV/letter files
and posting text into the application archive. Existing snapshots are immutable.
Identify missing materials honestly; never recreate a submitted document from
memory. The tracker preserves unknown columns and earlier applications.

Use `--date YYYY-MM-DD` when recording a past event. Record interview stage and feedback in the note. Offer `/interview` for the next
round and a brief thank-you draft after a completed interview. When several
applications resolve, suggest `/setup` to calibrate fit against the outcomes;
this command does not silently rewrite the profile or scoring framework.

## Follow-up branch

`followup [N]` lists applications quiet for N days (default 10); a company argument
selects that application. Count from the latest explicitly dated tracker event,
or the application date if no later event exists. Missing/unparseable dates are
unknown, never guessed. Exclude drafts and final statuses, and respect an
employer's stated response timeline. Present candidates before drafting.

Read the actual submitted materials and the active profile's writing preferences.
Draft a short message appropriate to the known channel, using only supported
claims. Do not invent a contact or email address. Save the draft in that row's
archive as `followup-YYYY-MM-DD.md`. Preparing it does not count as sending it.
Log `followed up YYYY-MM-DD` via an outcome note only after the user confirms it
was sent; cap unsolicited follow-up suggestions at two confirmed sends.

## Stale sweep

`stale [N]` lists open, submitted applications quiet for N days (default 60).
Ask the user which should become `no_response`; elapsed time alone is not an
outcome. Apply only the chosen row updates and retain their archives.
