#!/usr/bin/env node
/**
 * G-capsule: idle eyes stadium (ry > rx*1.08), diameter ≥15% body, gap ∈ [0.34,0.46], --bg holes.
 * PASS observes product: lab.html must not contain ellipse#eye-l/r; numbers come from
 * defineBlob(serializeRecipe()).faceGeometry("idle") vs compileSilhouette / defineBlob
 * silhouette bbox; engine eye paths fill var(--bg).
 * Twin: lab-like ellipses that meet the numbers but stay <ellipse>.
 *
 * fail-pass: ellipse-eyes | circle-eyes | small-eyes | eye-gap | hole-fill | missing-idle
 * fail-twin: ellipse-eyes
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { bbox } from "./lib/shape-metrics.mjs";
import { fail, isTwin, parseEyeEllipses, read, root } from "./lib/craft-util.mjs";

const twin = isTwin();

if (twin) {
  const eyes = parseEyeEllipses(read(resolve(root, "gates/fixtures/lab-ellipses.html")));
  if (eyes.length >= 2) fail("ellipse-eyes", "twin preview still uses ellipse#eye-l/r");
  fail("ellipse-eyes", "twin fixture lost its ellipses");
}

const html = read(resolve(root, "playground/lab.html"));
const previewEllipses = parseEyeEllipses(html);
if (previewEllipses.length || /<ellipse\b[^>]*id=["']eye-[lr]["']/i.test(html)) {
  fail("ellipse-eyes", "maker idle eyes are <ellipse> not stadium paths");
}

const { defineBlob } = await import(pathToFileURL(resolve(root, "src/engine/define-blob.js")).href);
const { applyTemplate, compileSilhouette, serializeRecipe } = await import(
  pathToFileURL(resolve(root, "playground/lab.mjs")).href
);
applyTemplate("gummy");
const recipe = serializeRecipe();

let geo;
try {
  geo = defineBlob(recipe).faceGeometry("idle");
} catch (e) {
  fail("missing-idle", e?.message ?? e);
}

const eyes = geo?.eyes ?? [];
if (eyes.length < 2) fail("missing-idle", "faceGeometry idle is not two measurable holes");

const compiled = compileSilhouette(recipe);
const sil = Array.isArray(geo.ring) && geo.ring.length ? geo.ring : compiled;
const box = bbox(sil);
if (!Number.isFinite(box.w) || box.w <= 0) fail("missing-idle", "no silhouette bbox");

const left = eyes[0];
const right = eyes[1];
const stadium = left.ry > left.rx * 1.08 && right.ry > right.rx * 1.08;
const diam = (Math.min(left.rx, right.rx) * 2) / box.w;
const gap = Math.abs(right.cx - left.cx) / box.w;

const engine = read(resolve(root, "src/engine/define-blob.js"));
const bgHoles = ["eye-l", "eye-r"].every((layer) => {
  const m = engine.match(new RegExp(`<path\\b([^>]*\\bdata-layer="${layer}"[^>]*)>`, "i"));
  return m ? /fill\s*=\s*["']var\(\s*--bg\s*\)["']/.test(m[1]) : false;
});

console.log(
  `measured  stadium=${stadium} diam=${(diam * 100).toFixed(1)}% gap=${gap.toFixed(3)} bg=${bgHoles} kind=stadium`,
);

if (!stadium) fail("circle-eyes", `ry/rx left=${(left.ry / left.rx).toFixed(3)}`);
if (diam < 0.15) fail("small-eyes", `diameter=${(diam * 100).toFixed(1)}%`);
if (gap < 0.34 || gap > 0.46) fail("eye-gap", `gap=${gap.toFixed(3)}`);
if (!bgHoles) fail("hole-fill", "eyes are not fill=var(--bg)");

console.log("PASS craft-capsule");
