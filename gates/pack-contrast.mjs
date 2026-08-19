#!/usr/bin/env node
/**
 * G-contrast
 * file:    dist/pack/spritesheet.webp  (does not exist yet)
 * pass:    fill vs hole luminance Δ on exported idle cell
 * twin:    fill ≈ #111110
 * fail-pass: missing-atlas | contrast-low
 * fail-twin: contrast-111110
 */
import { fail } from "./lib/pack-fail.mjs";
import { findPackDir, findSheet } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";
import { CONTRAST_LUMA, contrastDelta, extractCell } from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");

if (twin) {
  const img = decodeImage(synthTmp("contrast-111110").path);
  const d = contrastDelta(img);
  if (d < CONTRAST_LUMA) fail("contrast-111110", `delta=${d.toFixed(1)}`);
  fail("twin-not-111110", `delta=${d.toFixed(1)}`);
}

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const idle = extractCell(decodeImage(sheet), 0, 0);
if (!idle) fail("missing-atlas", "idle cell");
const d = contrastDelta(idle);
if (d < CONTRAST_LUMA) fail("contrast-low", `delta=${d.toFixed(1)}`);
console.log(`measured  contrast-delta=${d.toFixed(1)}`);
console.log("PASS pack-contrast");
