#!/usr/bin/env python3
"""Validate discoverable skill metadata and local Markdown reference targets."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def check(root: Path = ROOT) -> list[str]:
    errors = []
    for path in (root / ".agents/skills").glob("*/SKILL.md"):
        text = path.read_text()
        parts = text.split("---", 2)
        if not text.startswith("---\n") or len(parts) < 3:
            errors.append(f"{path.relative_to(root)}: missing frontmatter")
            continue
        name = re.search(r"^name:\s*(\S+)\s*$", parts[1], re.M)
        if not name or name[1] != path.parent.name:
            errors.append(f"{path.relative_to(root)}: name must match skill directory")
        if not re.search(r"^description:\s*\S", parts[1], re.M):
            errors.append(f"{path.relative_to(root)}: missing description")
        for target in re.findall(r"\]\(([^)]+)\)", text):
            if target.startswith(("http:", "https:", "#", "mailto:")):
                continue
            target = target.split("#", 1)[0]
            if "<" not in target and not (path.parent / target).exists():
                errors.append(f"{path.relative_to(root)}: broken reference {target}")
    return errors


if __name__ == "__main__":
    problems = check()
    print("\n".join(problems) if problems else "Skill metadata and references: OK")
    raise SystemExit(bool(problems))
