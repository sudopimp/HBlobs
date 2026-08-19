#!/usr/bin/env python3
"""Raster silhouette rings into a Codex atlas. Transparent backdrop."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

CELL_W = 192
CELL_H = 208
COLS = 8
ROWS = 9
ATLAS_W = COLS * CELL_W
ATLAS_H = ROWS * CELL_H
CLEAR = (0, 0, 0, 0)


def draw_cell(cell_spec: dict, fill: tuple, hole: tuple) -> Image.Image:
    im = Image.new("RGBA", (CELL_W, CELL_H), CLEAR)
    d = ImageDraw.Draw(im)
    ring = [(float(x), float(y)) for x, y in cell_spec["ring"]]
    if len(ring) >= 3:
        d.polygon(ring, fill=fill)
    for e in cell_spec.get("eyes") or []:
        cx = float(e["cx"])
        cy = float(e["cy"])
        rx = max(2.0, float(e["rx"]))
        ry = max(2.0, float(e["ry"]))
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=hole)
    return im


def main() -> int:
    spec = json.load(sys.stdin)
    fill = tuple(spec["fill"])
    hole = tuple(spec["hole"])
    out_dir = Path(spec["outDir"])
    out_dir.mkdir(parents=True, exist_ok=True)

    atlas = Image.new("RGBA", (ATLAS_W, ATLAS_H), CLEAR)
    idle = None
    for cell in spec["cells"]:
        im = draw_cell(cell, fill, hole)
        col = int(cell["col"])
        row = int(cell["row"])
        atlas.paste(im, (col * CELL_W, row * CELL_H), im)
        if row == 0 and col == 0:
            idle = im

    sheet = out_dir / "spritesheet.webp"
    atlas.save(sheet, "WEBP", lossless=True, quality=100)
    if idle is None:
        idle = Image.new("RGBA", (CELL_W, CELL_H), CLEAR)
    idle.save(out_dir / "preview-idle.png", "PNG")
    sys.stdout.write(json.dumps({"w": atlas.width, "h": atlas.height, "sheet": str(sheet)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
