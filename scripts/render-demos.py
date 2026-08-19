#!/usr/bin/env python3
"""Cut share GIFs and a contact sheet from real atlas pixels. No mockups."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CELL_W, CELL_H = 192, 208
COLS, ROWS = 8, 9
CODEX = [
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
FRAMES = {
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
MATTE = (22, 22, 26, 255)
GITHUB = Path(__file__).resolve().parents[1]


def load_sheet(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    if im.size != (CELL_W * COLS, CELL_H * ROWS):
        raise SystemExit(f"unexpected sheet {im.size} at {path}")
    return im


def cell(sheet: Image.Image, col: int, row: int) -> Image.Image:
    x, y = col * CELL_W, row * CELL_H
    return sheet.crop((x, y, x + CELL_W, y + CELL_H))


def matte(im: Image.Image, scale: int = 2) -> Image.Image:
    bg = Image.new("RGBA", im.size, MATTE)
    composed = Image.alpha_composite(bg, im)
    if scale != 1:
        composed = composed.resize((im.size[0] * scale, im.size[1] * scale), Image.Resampling.LANCZOS)
    return composed.convert(
        "P",
        palette=Image.Palette.ADAPTIVE,
        colors=256,
        dither=Image.Dither.NONE,
    )


def gif(sheet: Image.Image, row_name: str, dest: Path, ms: int = 90, scale: int = 2) -> None:
    row = CODEX.index(row_name)
    n = FRAMES[row_name]
    frames = [matte(cell(sheet, c, row), scale) for c in range(n)]
    dest.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        dest,
        save_all=True,
        append_images=frames[1:],
        duration=ms,
        loop=0,
        optimize=True,
        disposal=2,
    )


def contact_sheet(sheet: Image.Image, dest: Path) -> None:
    label_w = 132
    scale = 0.55
    cw, ch = int(CELL_W * scale), int(CELL_H * scale)
    out = Image.new("RGBA", (label_w + COLS * cw, ROWS * ch), MATTE)
    draw = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except OSError:
        font = ImageFont.load_default()
    for r, name in enumerate(CODEX):
        y = r * ch
        draw.text((8, y + ch // 2 - 6), name, fill=(230, 230, 235, 255), font=font)
        used = FRAMES[name]
        for c in range(COLS):
            tile = cell(sheet, c, r)
            if c >= used:
                tile = Image.new("RGBA", (CELL_W, CELL_H), (22, 22, 26, 255))
            else:
                bg = Image.new("RGBA", tile.size, MATTE)
                tile = Image.alpha_composite(bg, tile)
            tile = tile.resize((cw, ch), Image.Resampling.LANCZOS)
            out.paste(tile, (label_w + c * cw, y))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.convert("RGB").save(dest, "PNG", optimize=True)


def still(sheet: Image.Image, dest: Path, col: int = 0, row: int = 0, scale: int = 2) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    matte(cell(sheet, col, row), scale).save(dest, "PNG", optimize=True)


def family(paths: list[Path], dest: Path) -> None:
    tiles = []
    for p in paths:
        sheet = load_sheet(p)
        tiles.append(matte(cell(sheet, 0, 0), 2).convert("RGBA"))
    w = sum(t.size[0] for t in tiles) + 16 * (len(tiles) - 1)
    h = max(t.size[1] for t in tiles)
    out = Image.new("RGBA", (w, h), MATTE)
    x = 0
    for t in tiles:
        out.paste(t, (x, 0), t)
        x += t.size[0] + 16
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.convert("RGB").save(dest, "PNG", optimize=True)


def main() -> int:
    dest = GITHUB / "demos"
    dest.mkdir(exist_ok=True)
    main_sheet = load_sheet(GITHUB / "dist/pack/spritesheet.webp")
    gif(main_sheet, "idle", dest / "idle.gif", 110)
    gif(main_sheet, "running", dest / "run.gif", 80)
    gif(main_sheet, "running-right", dest / "walk.gif", 80)
    gif(main_sheet, "waving", dest / "wave.gif", 100)
    gif(main_sheet, "jumping", dest / "jump.gif", 90)
    contact_sheet(main_sheet, dest / "atlas.png")
    still(main_sheet, dest / "hero.png")

    packs = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/hblobs-demo-packs")
    variant_sheets = []
    for name in ("gummy", "chubby", "teal", "melt"):
        sheet_path = packs / name / "spritesheet.webp"
        if not sheet_path.is_file():
            continue
        sheet = load_sheet(sheet_path)
        gif(sheet, "idle", dest / f"{name}-idle.gif", 110)
        variant_sheets.append(sheet_path)
    if variant_sheets:
        family(variant_sheets, dest / "looks.png")

    manifest = {
        "source": "dist/pack/spritesheet.webp plus scripts/export-demos.mjs variants",
        "generated": "scripts/render-demos.py",
        "note": "Pixels from the live SDF atlas, not image-gen.",
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
