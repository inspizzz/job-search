"""Explicit, ignored profile paths shared by the workspace's stateful CLIs."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def profile_path(profile: Path, relative: str | Path) -> Path:
    """Reject escapes and symlinks, including not-yet-created output paths."""
    target = Path(relative)
    if not target.is_absolute():
        # Accept the repository-relative form emitted by older workflows too,
        # while still checking it belongs to this exact profile.
        target = (profile.parent.parent / target if target.parts[:1] == ("profiles",)
                  else profile / target)
    if ".." in target.parts:
        raise ValueError("parent traversal is not allowed in profile paths")
    try:
        parts = target.relative_to(profile).parts
    except ValueError:
        raise ValueError("path must be inside the selected profile") from None
    current = profile
    for part in parts:
        current /= part
        if current.is_symlink():
            raise ValueError("symlinks are not allowed in candidate data paths")
    if not target.resolve().is_relative_to(profile.resolve()):
        raise ValueError("path escapes the selected profile")
    return target


def resolve_profile(slug: str, root: Path = ROOT) -> Path:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug == "example":
        raise ValueError("select a real local profile slug; example is a reserved scaffold")
    root = root.resolve()
    profiles = root / "profiles"
    profile = profiles / slug
    if profiles.is_symlink() or profile.is_symlink():
        raise ValueError("profile directories must not be symlinks")
    manifest = profile_path(profile, "PROFILE.md")
    if not manifest.is_file():
        raise ValueError("profile manifest not found; create a local profile first")
    rel = manifest.relative_to(root).as_posix()
    ignored = subprocess.run(["git", "check-ignore", "-q", "--", rel], cwd=root,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if ignored.returncode != 0:
        raise ValueError("selected profile must be ignored and untracked by Git")
    tracked = subprocess.check_output(["git", "ls-files", "--", f"profiles/{slug}/"], cwd=root)
    if tracked.strip():
        raise ValueError("selected profile contains tracked files; repair privacy exclusions first")
    return profile
