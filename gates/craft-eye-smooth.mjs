#!/usr/bin/env node
/**
 * G-eye-smooth: idle stadium eyes ease the cap↔side join (Figma/iOS ξ).
 * Flat paint is evenodd-punched (no blur, no overlay stroke).
 *
 * pass:    src/engine/face.js eyePath + define-blob / engine-frame markup
 * twin:    gates/fixtures/eye-sampled-ring.mjs
 * fail-pass: hard-join | sampled-ring | eye-blur | overlay-stroke | evenodd-hole
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

if (/eye-soft/.test(engine) || /data-layer="eye-[lr]"[^>]*filter=/.test(engine) || /hblob-eye-soft/.test(frame)) {
  fail("eye-blur", "flat eyes still use a blur filter");
}
if (/data-layer="eye-[lr]"[^>]*\bstroke=/.test(engine) || /\$\{eye[LR]\}" fill="\$\{hole\}" stroke=/.test(frame)) {
  fail("overlay-stroke", "flat eyes still expand coverage with a stroke");
}
if (!/data-layer="body"[^>]*fill-rule="evenodd"/.test(engine) || !/fill-rule="evenodd"/.test(frame)) {
  fail("evenodd-hole", "candy is not an evenodd punch");
}

const plates = ["eye-l", "eye-r"].every((layer) => {
  const m = engine.match(new RegExp(`<path\\b([^>]*\\bdata-layer="${layer}"[^>]*)>`, "i"));
  return m ? /fill\s*=\s*["']var\(\s*--bg\s*\)["']/.test(m[1]) : false;
});
if (!plates) fail("evenodd-hole", "under-plate eyes are not fill=var(--bg)");

console.log(`measured  C=${measured.C} L=${measured.L} V=${measured.V} A=${measured.A} evenodd=1 blur=0`);
console.log("PASS craft-eye-smooth");
