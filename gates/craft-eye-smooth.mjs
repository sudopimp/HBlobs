#!/usr/bin/env node
/**
 * G-eye-smooth: idle stadium eyes ease the cap↔side join (Figma/iOS ξ),
 * not a hard C+L stadium and not a 48-point sampled ring. Eye holes carry
 * a same-color non-scaling stroke so the dark-on-bright rim keeps coverage.
 *
 * pass:    src/engine/face.js eyePath + define-blob / engine-frame markup
 * twin:    gates/fixtures/eye-sampled-ring.mjs
 * fail-pass: hard-join | sampled-ring | hole-stroke
 * fail-twin: sampled-ring
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail, isTwin, read, root } from "./lib/craft-util.mjs";

const twin = isTwin();

function counts(d) {
  return {
    C: (String(d).match(/C/g) || []).length,
    L: (String(d).match(/L/g) || []).length,
    V: (String(d).match(/V/g) || []).length,
    A: (String(d).match(/A/g) || []).length,
  };
}

function assertSmooth(d, label) {
  const n = counts(d);
  if (n.C === 4 && n.L >= 2) {
    fail("hard-join", `${label} C=${n.C} L=${n.L} (cap↔side is still a hard C+L join)`);
  }
  if (n.C > 24 || (n.A === 0 && n.C < 6)) {
    fail("sampled-ring", `${label} C=${n.C} A=${n.A} (want smoothed capsule, not a 48-pt ring)`);
  }
  return n;
}

const faceMod = twin
  ? await import(pathToFileURL(resolve(root, "gates/fixtures/eye-sampled-ring.mjs")).href)
  : await import(pathToFileURL(resolve(root, "src/engine/face.js")).href);

const d = faceMod.eyePath(-1, 1, 1.28, 0, 0, -16, -7, 1);
const n = counts(d);

if (twin) {
  if (n.C <= 8) fail("twin-not-sampled", `C=${n.C}`);
  fail("sampled-ring", `C=${n.C} L=${n.L} V=${n.V}`);
}

const measured = assertSmooth(d, "idle-left");

const engine = read(resolve(root, "src/engine/define-blob.js"));
const frame = read(resolve(root, "src/pack/engine-frame.js"));
const liveStroke = ["eye-l", "eye-r"].every((layer) => {
  const m = engine.match(new RegExp(`<path\\b([^>]*\\bdata-layer="${layer}"[^>]*)>`, "i"));
  if (!m) return false;
  const attrs = m[1];
  return (
    /fill\s*=\s*["']var\(\s*--bg\s*\)["']/.test(attrs) &&
    /stroke\s*=\s*["']var\(\s*--bg\s*\)["']/.test(attrs) &&
    /vector-effect\s*=\s*["']non-scaling-stroke["']/.test(attrs)
  );
});
const packStroke = /<path d="\$\{eyeL\}" fill="\$\{hole\}" stroke="\$\{hole\}"/.test(frame);

if (!liveStroke || !packStroke) {
  fail("hole-stroke", `live=${liveStroke} pack=${packStroke}`);
}

console.log(`measured  C=${measured.C} L=${measured.L} V=${measured.V} A=${measured.A} stroke=1`);
console.log("PASS craft-eye-smooth");
