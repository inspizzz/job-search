import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from tools import application_state as app
from tools.privacy_check import check, ROOT
from tools.profile_paths import profile_path, resolve_profile


class Workspace(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        shutil.copyfile(ROOT / ".gitignore", self.root / ".gitignore")
        example = self.root / "profiles/example"
        example.mkdir(parents=True)
        (example / "PROFILE.md").write_text("Template only")
        self.profile = self.root / "profiles/fixture"
        self.profile.mkdir()
        (self.profile / "PROFILE.md").write_text("Synthetic candidate")

    def test_profile_requires_explicit_ignored_manifest(self):
        self.assertEqual(resolve_profile("fixture", self.root), self.profile)
        for slug in ("example", "../fixture", "missing", "Fixture", ""):
            with self.subTest(slug=slug), self.assertRaises(ValueError):
                resolve_profile(slug, self.root)
        subprocess.run(["git", "add", "-f", "profiles/fixture/PROFILE.md"], cwd=self.root, check=True)
        with self.assertRaises(ValueError):
            resolve_profile("fixture", self.root)

    def test_paths_reject_traversal_other_profiles_and_symlinks(self):
        (self.profile / "outside").symlink_to(self.root, target_is_directory=True)
        for value in ("../example/PROFILE.md", self.root / "profiles/example/PROFILE.md", "outside/private.json"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                profile_path(self.profile, value)
        self.assertEqual(profile_path(self.profile, "profiles/fixture/cv/sample.tex"), self.profile / "cv/sample.tex")
        with self.assertRaises(ValueError):
            profile_path(self.profile, "profiles/example/PROFILE.md")

    def test_effective_ignore_regression_and_force_added_personal_data(self):
        self.assertEqual(check(self.root), [])
        with (self.root / ".gitignore").open("a") as stream:
            stream.write("\n!/profiles/privacy-probe/\n!/profiles/privacy-probe/PROFILE.md\n")
        self.assertTrue(any("not effectively ignored" in e for e in check(self.root)))
        subprocess.run(["git", "add", "-f", "profiles/fixture/PROFILE.md"], cwd=self.root, check=True)
        self.assertTrue(any("private path is tracked" in e for e in check(self.root)))

    def draft(self, **extra):
        data = {"company": "Acme / Lab", "role": "Engineer / Analyst", "posting_text": "Original posting", **extra}
        return app.record_draft(self.profile, data, "2026-09-21")

    def test_draft_submission_snapshot_and_repeat_application(self):
        document = self.profile / "cv/sample.tex"
        document.parent.mkdir()
        document.write_text("Version actually submitted")
        initial = self.draft(cv_file="cv/sample.tex", deadline="2026-10-01")
        app.record_outcome(self.profile, 1, "applied", "Confirmed by user", "2026-09-21")
        archive = self.profile / initial["archive"]
        self.assertEqual((archive / "submitted_cv.tex").read_text(), "Version actually submitted")
        self.assertEqual((archive / "job_posting.md").read_text(), "Original posting")
        document.write_text("Later revision")
        app.record_outcome(self.profile, 1, "interview", 'A note, with "quotes"\nand a newline', "2026-09-22")
        self.assertEqual((archive / "submitted_cv.tex").read_text(), "Version actually submitted")
        with self.assertRaises(ValueError):
            self.draft()
        app.record_outcome(self.profile, 1, "rejected", "Reported decision", "2026-09-23")
        repeated = self.draft()
        self.assertEqual(repeated["row"], 2)
        self.assertNotEqual(repeated["archive"], initial["archive"])

    def test_later_outcome_uses_snapshot_when_working_file_was_removed(self):
        (self.profile / "cv").mkdir()
        document = self.profile / "cv/sample.tex"
        document.write_text("Submitted material")
        self.draft(cv_file="profiles/fixture/cv/sample.tex")
        app.record_outcome(self.profile, 1, "applied", "Confirmed", "2026-09-21")
        document.unlink()
        app.record_outcome(self.profile, 1, "rejected", "Decision", "2026-09-23")
        self.assertEqual(app.read_tracker(self.profile / "job_search_tracker.csv")[1][0]["status"], "rejected")

    def test_legacy_csv_unknown_columns_and_quoted_notes_survive(self):
        tracker = self.profile / "job_search_tracker.csv"
        tracker.write_text('\ufeffcompany,role,status,custom\nOld,Role,no response,keep\n', encoding="utf-8")
        self.draft(notes='Note, with "quotes"\nand a newline')
        fields, rows = app.read_tracker(tracker)
        self.assertIn("deadline", fields)
        self.assertEqual(rows[0], {"company": "Old", "role": "Role", "status": "no response", "custom": "keep", **{f: "" for f in fields if f not in {"company", "role", "status", "custom"}}})
        self.assertEqual(rows[1]["notes"], 'Note, with "quotes"\nand a newline')

    def test_bad_input_writes_nothing(self):
        self.draft()
        tracker = self.profile / "job_search_tracker.csv"
        original = tracker.read_bytes()
        for fields in ({"deadline": "next week"}, {"fit_rating": "NaN"}, {"cv_file": "../example/PROFILE.md"}, {"status": "applied"}):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.draft(**fields)
            self.assertEqual(tracker.read_bytes(), original)

    def test_reports_escape_html_and_reject_executable_links(self):
        output = app.report_html([{"company": "<script>alert(1)</script>", "source": "javascript:alert(1)", "notes": '<img src=x onerror="alert(1)">', "status": "drafted"}])
        self.assertNotIn("<script>alert", output)
        self.assertNotIn("javascript:", output)
        self.assertNotIn("<img", output)
        self.assertIn("&lt;script&gt;", output)
        self.assertNotIn('src="http', output)
        self.assertNotIn('<a href=', app.report_html([{"source": "http://["}]))


if __name__ == "__main__":
    unittest.main()
