#!/usr/bin/env node
/**
 * G-alpha
 * file:    dist/pack/spritesheet.webp  (does not exist yet)
 * pass:    flood from corners clears backdrop; unused Codex columns max alpha 0
 * twin:    painted corner-clear on #111110
 * fail-pass: missing-atlas | leftover-backdrop | unused-opaque
 * fail-twin: painted-corner-clear
 */
import { fail } from "./lib/pack-fail.mjs";
import { findPackDir, findSheet } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";
import { leftoverOpaque, unusedColumnOpaque } from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");

function alphaTokens(img) {
  const tokens = [];
  const unused = unusedColumnOpaque(img);
  if (unused > 0) tokens.push("unused-opaque");
  const leftover = leftoverOpaque(img);
  // A real flood-cut body leaves leftover = body pixels only; painted
  // corner-clear leaves nearly the whole sheet opaque after a 12px corner bite.
  const area = img.w * img.h;
  if (leftover > area * 0.55) tokens.push("painted-corner-clear");
  if (leftover > area * 0.55) tokens.push("leftover-backdrop");
  return { unused, leftover, tokens };
}

if (twin) {
  const { path } = synthTmp("corner-clear");
  const img = decodeImage(path);
  const { leftover, unused, tokens } = alphaTokens(img);
  if (tokens.includes("painted-corner-clear")) {
    fail("painted-corner-clear", `leftover=${leftover} unused=${unused}`);
  }
  fail("twin-not-corner-clear", `leftover=${leftover} unused=${unused}`);
}

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const img = decodeImage(sheet);
const { leftover, unused, tokens } = alphaTokens(img);
if (tokens.includes("unused-opaque")) fail("unused-opaque", `cells=${unused}`);
if (tokens.includes("painted-corner-clear") || tokens.includes("leftover-backdrop")) {
  fail("leftover-backdrop", `leftover=${leftover}`);
}
console.log(`measured  leftover=${leftover} unusedOpaqueCells=${unused}`);
console.log("PASS pack-alpha");
