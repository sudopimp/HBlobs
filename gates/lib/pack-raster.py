#!/usr/bin/env python3
"""Decode / encode / synth rasters for HBlobs pack gates. Synthetic only."""
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

FRAME_COUNTS = {
    "idle": 6,
    "running-right": 8,
    "running-left": 8,
    "waving": 4,
    "jumping": 5,
    "failed": 8,
    "waiting": 6,
    "running": 6,
    "review": 6,
}
ROW_ORDER = [
    "idle",
    "running-right",
    "running-left",
    "waving",
    "jumping",
    "failed",
    "waiting",
    "running",
    "review",
]

MAGENTA = (232, 74, 154, 255)
DARK = (17, 17, 16, 255)  # #111110
CLEAR = (0, 0, 0, 0)


def decode(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    dest.write_bytes(im.tobytes())
    sys.stdout.write(json.dumps({"w": im.width, "h": im.height}))


def encode(raw: Path, w: int, h: int, dest: Path) -> None:
    im = Image.frombytes("RGBA", (w, h), raw.read_bytes())
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")


def blob_cell(rot: float = 0, ox: int = 0, oy: int = 0, fill=MAGENTA, holes=True) -> Image.Image:
    im = Image.new("RGBA", (CELL_W, CELL_H), CLEAR)
    d = ImageDraw.Draw(im)
    d.ellipse((36 + ox, 48 + oy, 156 + ox, 186 + oy), fill=fill)
    d.ellipse((52 + ox, 24 + oy, 140 + ox, 118 + oy), fill=fill)
    d.ellipse((44 + ox, 14 + oy, 86 + ox, 56 + oy), fill=fill)
    d.ellipse((106 + ox, 14 + oy, 148 + ox, 56 + oy), fill=fill)
    if holes:
        hole = (fill[0] // 8, fill[1] // 8, fill[2] // 8, 255)
        d.ellipse((68 + ox, 78 + oy, 86 + ox, 112 + oy), fill=hole)
        d.ellipse((106 + ox, 78 + oy, 124 + ox, 112 + oy), fill=hole)
    if rot:
        im = im.rotate(rot, resample=Image.NEAREST, center=(96, 104), fillcolor=CLEAR)
    return im


def paste_cell(atlas: Image.Image, cell: Image.Image, col: int, row: int) -> None:
    atlas.paste(cell, (col * CELL_W, row * CELL_H), cell)


def empty_atlas() -> Image.Image:
    return Image.new("RGBA", (ATLAS_W, ATLAS_H), CLEAR)


def paint_used(atlas: Image.Image, cell_fn) -> None:
    for row, name in enumerate(ROW_ORDER):
        n = FRAME_COUNTS[name]
        for col in range(n):
            paste_cell(atlas, cell_fn(col, row), col, row)


def save_img(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    suffix = dest.suffix.lower()
    if suffix == ".webp":
        im.save(dest, "WEBP", lossless=True)
    else:
        im.save(dest, "PNG")


def synth(kind: str, dest: Path) -> None:
    if kind == "blank":
        save_img(empty_atlas(), dest)
        return
    if kind == "png512":
        im = Image.new("RGBA", (512, 512), DARK)
        save_img(im, dest)
        return
    if kind == "corner-clear":
        im = Image.new("RGBA", (ATLAS_W, ATLAS_H), DARK)
        d = ImageDraw.Draw(im)
        for x, y in ((0, 0), (ATLAS_W - 12, 0), (0, ATLAS_H - 12), (ATLAS_W - 12, ATLAS_H - 12)):
            d.rectangle((x, y, x + 11, y + 11), fill=CLEAR)
        save_img(im, dest)
        return
    if kind == "nine-idle":
        atlas = empty_atlas()
        cell = blob_cell()
        for row in range(ROWS):
            for col in range(COLS):
                paste_cell(atlas, cell, col, row)
        save_img(atlas, dest)
        return
    if kind == "nudge-2px":
        atlas = empty_atlas()

        def cell_fn(col, row):
            if row == 7:
                return blob_cell(ox=2 if col == 3 else 0)
            return blob_cell()

        paint_used(atlas, cell_fn)
        save_img(atlas, dest)
        return
    if kind == "lab-rotate-a":
        save_img(blob_cell(rot=-8), dest)
        return
    if kind == "lab-rotate-b":
        save_img(blob_cell(rot=6), dest)
        return
    if kind == "contrast-111110":
        im = Image.new("RGBA", (CELL_W, CELL_H), CLEAR)
        d = ImageDraw.Draw(im)
        d.ellipse((36, 48, 156, 186), fill=DARK)
        d.ellipse((68, 78, 86, 112), fill=(14, 14, 13, 255))
        d.ellipse((106, 78, 124, 112), fill=(14, 14, 13, 255))
        save_img(im, dest)
        return
    if kind == "preview-512":
        im = Image.new("RGBA", (512, 512), DARK)
        d = ImageDraw.Draw(im)
        d.ellipse((80, 80, 432, 432), fill=MAGENTA)
        save_img(im, dest)
        return
    if kind == "idle-cell":
        save_img(blob_cell(), dest)
        return
    if kind == "petdex-sheet":
        atlas = empty_atlas()
        paint_used(atlas, lambda col, row: blob_cell())
        save_img(atlas, dest)
        return
    if kind == "invert-empty":
        save_img(Image.new("RGBA", (64, 64), CLEAR), dest)
        return
    if kind == "invert-1":
        im = Image.new("RGBA", (64, 64), CLEAR)
        ImageDraw.Draw(im).ellipse((22, 22, 42, 42), fill=MAGENTA)
        save_img(im, dest)
        return
    if kind == "invert-2":
        im = Image.new("RGBA", (96, 64), CLEAR)
        d = ImageDraw.Draw(im)
        d.ellipse((8, 22, 28, 42), fill=MAGENTA)
        d.ellipse((68, 22, 88, 42), fill=MAGENTA)
        save_img(im, dest)
        return
    if kind == "invert-3":
        im = Image.new("RGBA", (96, 64), CLEAR)
        d = ImageDraw.Draw(im)
        d.ellipse((4, 22, 20, 38), fill=MAGENTA)
        d.ellipse((40, 8, 56, 24), fill=MAGENTA)
        d.ellipse((72, 36, 88, 52), fill=MAGENTA)
        save_img(im, dest)
        return
    raise SystemExit(f"unknown synth kind {kind}")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: pack-raster.py decode|encode|synth ...", file=sys.stderr)
        return 2
    cmd = argv[1]
    if cmd == "decode":
        decode(Path(argv[2]), Path(argv[3]))
        return 0
    if cmd == "encode":
        encode(Path(argv[2]), int(argv[3]), int(argv[4]), Path(argv[5]))
        return 0
    if cmd == "synth":
        synth(argv[2], Path(argv[3]))
        return 0
    print(f"unknown cmd {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
