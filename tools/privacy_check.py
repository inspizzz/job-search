#!/usr/bin/env python3
"""Check tracked candidate-data boundaries and effective ignore behaviour."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRIVATE_ROOTS = {"cv", "cover_letters", "documents", "job_scraper", "upskill",
                 "reports", "company_research", "gmail_sync"}
PRIVATE_FILES = {"salary_data.json", "job_search_tracker.csv", ".claude/settings.local.json"}
PRIVATE_FILES.update(f".claude/skills/job-application-assistant/{name}.md" for name in
                     ("01-candidate-profile", "02-behavioral-profile", "04-job-evaluation", "07-interview-prep"))
PRIVATE_FILES.add(".claude/skills/job-scraper/search-queries.md")
PROBES = ["profiles/privacy-probe/PROFILE.md", "profiles/privacy-probe/profile/01-candidate-profile.md",
          "profiles/privacy-probe/cv/main_example.tex", "profiles/privacy-probe/reports/dashboard.html",
          "profiles/privacy-probe/documents/applications/sample/outcome.md", ".env", ".env.local",
          ".claude/settings.local.json", "job_search_tracker.csv", "salary_data.json",
          "reports/application-dashboard.html", "company_research/sample.json",
          ".claude/skills/job-scraper/job_scraper/seen_jobs.json",
          ".claude/skills/upskill/upskill/report-probe.md"]


def check(root: Path = ROOT) -> list[str]:
    errors = []
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
    for name in filter(None, tracked):
        p = Path(name)
        private = (p.parts[0] in PRIVATE_ROOTS or name in PRIVATE_FILES
                   or (p.name.startswith(".env") and p.name != ".env.example")
                   or ".claude/projects/" in name)
        if name.startswith("profiles/"):
            private |= name != "profiles/README.md" and not name.startswith("profiles/example/")
        if private:
            errors.append(f"private path is tracked: {name}")
    for name in PROBES:
        if subprocess.run(["git", "check-ignore", "--no-index", "-q", "--", name], cwd=root).returncode != 0:
            errors.append(f"private path is not effectively ignored: {name}")
    # Assert scaffold identity tokens, not any particular person's details.
    sentinel = root / "profiles/example/PROFILE.md"
    if not sentinel.is_file() or "Template only" not in sentinel.read_text():
        errors.append("example manifest must remain a blank template")
    return errors


if __name__ == "__main__":
    problems = check()
    print("\n".join(problems) if problems else "Privacy boundaries and ignore probes: OK")
    raise SystemExit(bool(problems))
