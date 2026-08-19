#!/usr/bin/env node
/**
 * G-map
 * file:    src/pack/map.js  (does not exist yet)
 * pass:    7 activity names + running-right/left paint a cell; run → row 7; unknown throws
 * twin:    gates/fixtures/map-row0.mjs
 * fail-pass: missing-map | run-not-row-7 | unpainted-cell | unknown-accepted
 * fail-twin: all-seven-map-to-row-0
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail } from "./lib/pack-fail.mjs";
import { MAP_FILE, findPackDir, findSheet, root } from "./lib/pack-paths.mjs";
import { decodeImage } from "./lib/pack-raster.mjs";
import { HERMES_ACTIVITIES, ROAM_NAMES, expectedRow, usedCell } from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");
const implPath = twin ? resolve(root, "gates/fixtures/map-row0.mjs") : resolve(root, MAP_FILE);

if (!existsSync(implPath)) fail(twin ? "missing-twin-fixture" : "missing-map");

const mod = await import(pathToFileURL(implPath).href);
if (typeof mod.mapActivity !== "function") fail("mapActivity-not-fn");

const names = [...HERMES_ACTIVITIES, ...ROAM_NAMES];
const rows = names.map((n) => {
  let row;
  try {
    row = mod.mapActivity(n);
  } catch (e) {
    fail(twin ? "twin-threw" : "map-threw", `${n} ${e?.message ?? e}`);
  }
  return { n, row };
});

if (twin) {
  if (rows.every((r) => r.row === 0)) fail("all-seven-map-to-row-0");
  fail("twin-not-row0", rows.map((r) => `${r.n}:${r.row}`).join(","));
}

const run = rows.find((r) => r.n === "run");
if (run.row !== 7) fail("run-not-row-7", `got ${run.row}`);

for (const { n, row } of rows) {
  const want = expectedRow(n);
  if (row !== want) fail("row-mismatch", `${n} got ${row} want ${want}`);
}

let unknownThrew = false;
try {
  mod.mapActivity("orbit-zzz");
} catch {
  unknownThrew = true;
}
if (!unknownThrew) fail("unknown-accepted");

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const img = decodeImage(sheet);
for (const { n, row } of rows) {
  if (!usedCell(img, 0, row)) fail("unpainted-cell", n);
}

console.log("PASS pack-map");
