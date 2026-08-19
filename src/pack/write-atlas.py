#!/usr/bin/env python3
"""Raster engine SVG frames into a Codex atlas. Transparent backdrop."""
from __future__ import annotations

import json
import sys
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

CELL_W = 192
CELL_H = 208
COLS = 8
ROWS = 9
ATLAS_W = COLS * CELL_W
ATLAS_H = ROWS * CELL_H
CLEAR = (0, 0, 0, 0)
SRC = 384


def svg_cell(svg: str, flip: bool) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=SRC, output_height=SRC)
    im = Image.open(BytesIO(png)).convert("RGBA")
    im = im.resize((CELL_W, CELL_W), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (CELL_W, CELL_H), CLEAR)
    cell.paste(im, (0, (CELL_H - CELL_W) // 2), im)
    if flip:
        cell = cell.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return cell


def draw_poly(cell_spec: dict, fill: tuple, hole: tuple) -> Image.Image:
    im = Image.new("RGBA", (CELL_W, CELL_H), CLEAR)
    draw = ImageDraw.Draw(im)
    ring = [(float(x), float(y)) for x, y in cell_spec.get("ring") or []]
    if len(ring) >= 3:
        draw.polygon(ring, fill=fill)
    for e in cell_spec.get("eyes") or []:
        if e.get("ring"):
            draw.polygon([(float(x), float(y)) for x, y in e["ring"]], fill=hole)
            continue
        cx = float(e["cx"])
        cy = float(e["cy"])
        rx = max(2.0, float(e["rx"]))
        ry = max(2.0, float(e["ry"]))
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=hole)
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
        if cell.get("svg"):
            im = svg_cell(cell["svg"], bool(cell.get("flip")))
        else:
            im = draw_poly(cell, fill, hole)
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
