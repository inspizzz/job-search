#!/usr/bin/env python3
"""Local application tracker, immutable submission archives, and offline reports.

Every command requires --profile. Use draft --data <relative JSON path>, outcome
--row N --status STATUS, list, or report. Nothing sends or submits applications.
"""
import argparse
import csv
import html
import io
import json
import math
import os
import shutil
import sys
import tempfile
import uuid
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

try:
    from .profile_paths import resolve_profile, profile_path
    from .job_key import make_key
except ImportError:
    from profile_paths import resolve_profile, profile_path
    from job_key import make_key

FIELDS = "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline,archive".split(",")
STATUSES = {"drafted", "applied", "screening", "interview", "assessment", "offer", "hired",
            "rejected", "withdrawn", "no_response", "offer_declined"}
FINAL = {"hired", "rejected", "withdrawn", "no_response", "offer_declined"}


def status(value):
    return str(value or "").strip().lower().replace(" ", "_")


def read_tracker(path):
    if not path.exists():
        return FIELDS.copy(), []
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        fields = reader.fieldnames or []
        if not {"company", "role", "status"}.issubset(fields) or len(fields) != len(set(fields)):
            raise ValueError("tracker needs unique company, role, and status columns")
        rows = list(reader)
    if any(None in row for row in rows):
        raise ValueError("tracker has extra unquoted CSV fields; repair before updating")
    return fields, [{k: v or "" for k, v in row.items()} for row in rows]


def atomic_write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".application-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as stream:
            stream.write(text)
        os.replace(temp, path)
    finally:
        Path(temp).unlink(missing_ok=True)


def write_tracker(path, fields, rows):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
    atomic_write(path, stream.getvalue())


def validate_date(value):
    if value and (len(value) != 10 or date.fromisoformat(value).isoformat() != value):
        raise ValueError("dates must use YYYY-MM-DD")


def archive_path(profile, row, today):
    relative = row.get("archive")
    if not relative:
        # Distinct attempts at the same company/role must not share an archive.
        relative = f"documents/applications/{make_key(row['company'], row['role'])}_{today}_{uuid.uuid4().hex[:8]}"
    path = profile_path(profile, relative)
    if not path.is_relative_to(profile / "documents/applications"):
        raise ValueError("archive must be under this profile's documents/applications")
    return path


def record_draft(profile, data, today):
    if not isinstance(data, dict):
        raise ValueError("draft data must be a JSON object")
    for field in ("company", "role"):
        if not isinstance(data.get(field), str) or not data[field].strip():
            raise ValueError(f"{field} is required")
    for key, value in data.items():
        if key not in set(FIELDS) | {"posting_text"} or not isinstance(value, str):
            raise ValueError(f"unsupported field or non-string value: {key}")
    if data.get("status", "drafted") != "drafted" or data.get("archive"):
        raise ValueError("draft writes only drafted status and allocates its own archive")
    validate_date(data.get("deadline", ""))
    if data.get("fit_rating"):
        score = float(data["fit_rating"])
        if not math.isfinite(score) or not 0 <= score <= 100:
            raise ValueError("fit_rating must be a number from 0 to 100")
    for field in ("cv_file", "cover_letter_file"):
        if data.get(field):
            file = profile_path(profile, data[field])
            if not file.is_file():
                raise ValueError(f"{field} does not exist inside this profile")
    tracker = profile_path(profile, "job_search_tracker.csv")
    fields, rows = read_tracker(tracker)
    matches = [i for i, row in enumerate(rows) if row["company"].casefold() == data["company"].casefold()
               and row["role"].casefold() == data["role"].casefold() and status(row["status"]) not in FINAL]
    if len(matches) > 1:
        raise ValueError("multiple open applications match; select/update an explicit tracker row")
    if matches and status(rows[matches[0]]["status"]) != "drafted":
        raise ValueError("application already submitted; keep its materials intact and select it via outcome")
    index = matches[0] if matches else len(rows)
    row = rows[index].copy() if matches else {field: "" for field in fields}
    row.update({k: v for k, v in data.items() if k not in {"posting_text", "date", "archive"}})
    row.update(date=row.get("date") or today, status="drafted")
    archive = archive_path(profile, row, today)
    row["archive"] = archive.relative_to(profile).as_posix()
    for field in FIELDS:
        if field not in fields:
            fields.append(field)
    # Validate paths before writing either artifact. Existing submitted postings are immutable.
    posting = profile_path(profile, archive / "draft_posting.md")
    archive.mkdir(parents=True, exist_ok=True)
    if data.get("posting_text"):
        atomic_write(posting, data["posting_text"])
    if matches:
        rows[index] = row
    else:
        rows.append(row)
    write_tracker(tracker, fields, rows)
    return {"row": index + 1, "status": "drafted", "archive": row["archive"]}


def record_outcome(profile, number, new_status, note, today):
    if new_status not in STATUSES:
        raise ValueError("unknown application status")
    tracker = profile_path(profile, "job_search_tracker.csv")
    fields, rows = read_tracker(tracker)
    if number < 1 or number > len(rows):
        raise ValueError("row number is outside the tracker")
    row = rows[number - 1].copy()
    if status(row["status"]) != "drafted" and new_status == "drafted":
        raise ValueError("cannot turn a submitted application back into a draft")
    archive = archive_path(profile, row, today)
    copies = []
    # Archive the documents on the first confirmed submission/stage update.
    if new_status not in {"drafted", "withdrawn"}:
        for field, basename in (("cv_file", "submitted_cv"), ("cover_letter_file", "submitted_letter")):
            if row.get(field):
                source = profile_path(profile, row[field])
                destination = profile_path(profile, archive / (basename + source.suffix))
                if not destination.exists():
                    if not source.is_file():
                        raise ValueError(f"{field} is missing; resolve it before recording submission")
                    copies.append((source, destination))
        posting = profile_path(profile, archive / "draft_posting.md")
        target = profile_path(profile, archive / "job_posting.md")
        if posting.is_file() and not target.exists():
            copies.append((posting, target))
    outcome = profile_path(profile, archive / "outcome.md")
    previous = outcome.read_text(encoding="utf-8") if outcome.exists() else "# Application history\n"
    row["status"] = new_status
    row["archive"] = archive.relative_to(profile).as_posix()
    event = f"{today}: {new_status}" + (f" — {note}" if note else "")
    row["notes"] = (row.get("notes", "") + "\n" + event).strip()
    for field in ("archive", "notes"):
        if field not in fields:
            fields.append(field)
    archive.mkdir(parents=True, exist_ok=True)
    for source, target in copies:
        shutil.copyfile(source, target)
    atomic_write(outcome, previous + f"\n## {today}: {new_status}\n\n{note}\n")
    rows[number - 1] = row
    write_tracker(tracker, fields, rows)
    return {"row": number, "status": new_status, "archive": row["archive"]}


def report_html(rows):
    escape = lambda value: html.escape(str(value or ""), quote=True)
    counts = Counter(status(row.get("status")) for row in rows)
    cards = " ".join(f"<span><b>{escape(key)}</b>: {count}</span>" for key, count in sorted(counts.items()))
    body = []
    for index, row in enumerate(rows, 1):
        link = row.get("source", "")
        try:
            parsed = urlparse(link)
            safe = parsed.scheme in {"http", "https"} and bool(parsed.netloc)
        except ValueError:
            safe = False
        source = f'<a href="{escape(link)}" rel="noreferrer">Posting</a>' if safe else ""
        values = [index, row.get("company"), row.get("role"), row.get("status"), row.get("date"), row.get("deadline"), row.get("fit_rating"), row.get("notes")]
        body.append("<tr>" + "".join(f"<td>{escape(v)}</td>" for v in values) + f"<td>{source}</td></tr>")
    return '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Application dashboard</title><style>body{font:16px system-ui;margin:2rem;color:#193146;background:#f6f8fa}span{display:inline-block;padding:1rem;background:white;margin:.3rem;border-radius:.5rem}input{padding:.6rem;width:min(90%,35rem)}table{border-collapse:collapse;width:100%;background:white;margin-top:1rem}td,th{text-align:left;padding:.7rem;border-bottom:1px solid #ddd}td{white-space:pre-wrap}a{color:#176599}.scroll{overflow:auto}</style>
<h1>Application dashboard</h1><p>Local snapshot. Drafted applications have not been submitted.</p><div>''' + cards + '''</div><p><label>Filter applications <input id="filter" type="search"></label></p>
<div class="scroll"><table><thead><tr><th>#</th><th>Company</th><th>Role</th><th>Status</th><th>Date</th><th>Deadline</th><th>Fit</th><th>Notes</th><th>Source</th></tr></thead><tbody>''' + "".join(body) + '''</tbody></table></div>
<script>document.getElementById('filter').addEventListener('input',function(){const q=this.value.toLocaleLowerCase();document.querySelectorAll('tbody tr').forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase().includes(q);});});</script></html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list")
    draft = sub.add_parser("draft")
    draft.add_argument("--data", required=True)
    outcome = sub.add_parser("outcome")
    outcome.add_argument("--row", type=int, required=True)
    outcome.add_argument("--status", choices=sorted(STATUSES), required=True)
    outcome.add_argument("--note", default="")
    outcome.add_argument("--date", help="actual event date, YYYY-MM-DD; defaults to today")
    sub.add_parser("report")
    args = parser.parse_args()
    try:
        profile = resolve_profile(args.profile)
        today = date.today().isoformat()
        if args.command == "draft":
            data = json.loads(profile_path(profile, args.data).read_text(encoding="utf-8"))
            result = record_draft(profile, data, today)
        elif args.command == "outcome":
            if args.date:
                validate_date(args.date)
                today = args.date
            result = record_outcome(profile, args.row, args.status, args.note, today)
        else:
            _, rows = read_tracker(profile_path(profile, "job_search_tracker.csv"))
            if args.command == "report":
                output = profile_path(profile, "reports/application-dashboard.html")
                atomic_write(output, report_html(rows))
                result = {"report": str(output), "applications": len(rows)}
            else:
                result = [{"row": i, **row} for i, row in enumerate(rows, 1)]
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
