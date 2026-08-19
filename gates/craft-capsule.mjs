#!/usr/bin/env node
/**
 * G-capsule: idle eyes stadium (ry > rx*1.08), diameter ≥15% body, gap ∈ [0.34,0.46], --bg holes.
 * PASS measures the maker preview (lab.html ellipses vs compiled silhouette).
 * Twin: lab-like ellipses that meet the numbers but stay <ellipse>.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { bbox } from "./lib/shape-metrics.mjs";
import { fail, isTwin, parseEyeEllipses, read, root } from "./lib/craft-util.mjs";

const twin = isTwin();
const htmlPath = twin
  ? resolve(root, "gates/fixtures/lab-ellipses.html")
  : resolve(root, "playground/lab.html");
const html = read(htmlPath);
const eyes = parseEyeEllipses(html);

const { applyTemplate, compileSilhouette, serializeRecipe } = await import(
  pathToFileURL(resolve(root, "playground/lab.mjs")).href
);
applyTemplate("gummy");
const ring = compileSilhouette(serializeRecipe());
const box = bbox(ring);

if (twin) {
  if (eyes.length >= 2) fail("ellipse-eyes", "twin preview still uses ellipse#eye-l/r");
  fail("ellipse-eyes", "twin fixture lost its ellipses");
}

if (eyes.length < 2) {
  fail("ellipse-eyes", "maker idle eyes are not two measurable holes");
}

const left = eyes[0];
const right = eyes[1];
const stadium = left.ry > left.rx * 1.08 && right.ry > right.rx * 1.08;
const diam = (Math.min(left.rx, right.rx) * 2) / box.w;
const gap = Math.abs(right.cx - left.cx) / box.w;
const bgHoles = eyes.every((e) => /var\(\s*--bg\s*\)/.test(e.fill));

console.log(
  `measured  stadium=${stadium} diam=${(diam * 100).toFixed(1)}% gap=${gap.toFixed(3)} bg=${bgHoles} kind=ellipse`,
);

if (!stadium) fail("circle-eyes", `ry/rx left=${(left.ry / left.rx).toFixed(3)}`);
if (diam < 0.15) fail("small-eyes", `diameter=${(diam * 100).toFixed(1)}%`);
if (gap < 0.34 || gap > 0.46) fail("eye-gap", `gap=${gap.toFixed(3)}`);
if (!bgHoles) fail("hole-fill", "eyes are not fill=var(--bg)");
if (eyes.length) fail("ellipse-eyes", "maker idle eyes are <ellipse> not stadium paths");

console.log("PASS craft-capsule");
