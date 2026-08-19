#!/usr/bin/env python3
"""PetRenderer mode=unicode + optional adopt hash. Not a PTY show wrapper."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path

HEADER_RE = re.compile(r"mode=|Ctrl\+C|—")


def agent_root() -> Path:
    return Path(os.environ.get("HERMES_AGENT_ROOT", "/home/fer/.hermes/hermes-agent"))


def _prep_path() -> None:
    root = str(agent_root())
    if root not in sys.path:
        sys.path.insert(0, root)


def strip_header(text: str) -> str:
    lines = text.splitlines()
    while lines and (not lines[0].strip() or HEADER_RE.search(lines[0])):
        lines.pop(0)
    return "\n".join(lines)


def unicode_frame(sheet: Path, state: str, index: int) -> str:
    _prep_path()
    from agent.pet.render import PetRenderer

    renderer = PetRenderer(sheet, mode="unicode", unicode_cols=16)
    return strip_header(renderer.frame(state, index) or "")


def file_sha(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def adopt_hash(export_dir: Path, slug: str) -> dict:
    _prep_path()
    export_dir = export_dir.resolve()
    sheet = export_dir / "spritesheet.webp"
    if not sheet.is_file():
        sheet = export_dir / "spritesheet.png"
    export_hash = file_sha(sheet) if sheet.is_file() else ""

    home = Path(os.environ["HERMES_HOME"])
    dest = home / "pets" / slug
    dest.mkdir(parents=True, exist_ok=True)
    for name in ("pet.json", "spritesheet.webp", "spritesheet.png", "recipe.json"):
        src = export_dir / name
        if src.is_file():
            shutil.copy2(src, dest / name)

    from agent.pet.store import load_pet

    pet = load_pet(slug)
    loaded = str(pet.spritesheet) if pet else ""
    loaded_hash = file_sha(Path(loaded)) if loaded and Path(loaded).is_file() else ""
    return {
        "exportHash": export_hash,
        "loadedPath": loaded,
        "loadedHash": loaded_hash,
        "match": bool(export_hash and export_hash == loaded_hash),
    }


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: pet-unicode.py unicode|adopt-hash ...", file=sys.stderr)
        return 2
    cmd = argv[1]
    if cmd == "unicode":
        sys.stdout.write(unicode_frame(Path(argv[2]), argv[3], int(argv[4])))
        return 0
    if cmd == "adopt-hash":
        sys.stdout.write(json.dumps(adopt_hash(Path(argv[2]), argv[3])))
        return 0
    print(f"unknown cmd {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
