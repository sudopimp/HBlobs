#!/usr/bin/env node
/**
 * G-geom
 * file:    dist/pack/spritesheet.webp  (does not exist yet)
 * pass:    1536×1872, 192×208, Codex occupancy, used cells have alpha
 * twin:    blank 1536×1872 + 512 PNG named spritesheet.png
 * fail-pass: missing-atlas | geom-size | geom-occupancy
 * fail-twin: blank-atlas | spritesheet-png-512
 */
import { basename } from "node:path";
import { fail, failAll } from "./lib/pack-fail.mjs";
import { findPackDir, findSheet } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";
import {
  ATLAS_H,
  ATLAS_W,
  CELL_H,
  CELL_W,
  CODEX_ROWS,
  FRAME_COUNTS,
  occupancy,
  usedCell,
} from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");

function geomFails(img, name) {
  const tokens = [];
  if (img.w === 512 && img.h === 512) tokens.push({ token: "spritesheet-png-512", extra: name });
  if (img.w !== ATLAS_W || img.h !== ATLAS_H) {
    if (!tokens.some((t) => t.token === "spritesheet-png-512")) {
      tokens.push({ token: "geom-size", extra: `${img.w}x${img.h}` });
    }
    return tokens;
  }
  if (CELL_W * 8 !== ATLAS_W || CELL_H * 9 !== ATLAS_H) tokens.push({ token: "geom-cell" });
  const occ = occupancy(img);
  let blank = true;
  for (let r = 0; r < CODEX_ROWS.length; r++) {
    const want = FRAME_COUNTS[CODEX_ROWS[r]];
    if (occ[r] > 0) blank = false;
    if (occ[r] !== want) tokens.push({ token: "geom-occupancy", extra: `${CODEX_ROWS[r]} ${occ[r]}!=${want}` });
    if (want > 0 && !usedCell(img, 0, r)) {
      tokens.push({ token: "geom-empty-cell", extra: CODEX_ROWS[r] });
    }
  }
  if (blank) tokens.push({ token: "blank-atlas" });
  return tokens;
}

if (twin) {
  const blank = synthTmp("blank");
  const png = synthTmp("png512");
  const tokens = [];
  const blankFails = geomFails(decodeImage(blank.path), basename(blank.path));
  if (blankFails.some((t) => t.token === "blank-atlas")) tokens.push("blank-atlas");
  else tokens.push("twin-not-blank");
  const pngImg = decodeImage(png.path);
  const named = "spritesheet.png";
  if (pngImg.w === 512 && pngImg.h === 512) tokens.push({ token: "spritesheet-png-512", extra: named });
  else tokens.push("twin-not-512");
  failAll(tokens);
}

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const img = decodeImage(sheet);
const tokens = geomFails(img, basename(sheet));
if (tokens.length) failAll(tokens);
console.log(`measured  ${img.w}x${img.h} sheet=${basename(sheet)}`);
console.log("PASS pack-geom");
