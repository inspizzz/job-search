#!/usr/bin/env python3
"""Compile only the blank scaffold in a temporary directory, never a candidate."""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def smoke(output):
    for folder, engine, basename, pages in (("cv", "lualatex", "main_example", 2),
                                            ("cover_letters", "xelatex", "cover_example", 1)):
        destination = output / folder
        shutil.copytree(ROOT / "profiles/example" / folder, destination)
        proc = subprocess.run([engine, "-interaction=nonstopmode", "-halt-on-error", basename + ".tex"],
                              cwd=destination, capture_output=True, text=True)
        if proc.returncode:
            raise RuntimeError(proc.stdout[-5000:] + proc.stderr[-2000:])
        pdf = destination / (basename + ".pdf")
        subprocess.run([sys.executable, str(ROOT / "tools/verify_pdf.py"), str(pdf),
                        "--pages", str(pages), "--min-chars", "100"], check=True)
        print(f"Compiled blank {folder}: {pdf}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="new directory in which to retain smoke artifacts")
    args = parser.parse_args()
    if args.output:
        args.output.mkdir(parents=True, exist_ok=False)
        smoke(args.output.resolve())
    else:
        with tempfile.TemporaryDirectory(prefix="job-search-template-") as directory:
            smoke(Path(directory))
