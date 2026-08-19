#!/usr/bin/env node
/**
 * G-mass
 * file:    playground/lab.mjs addMass  (does not exist yet)
 * pass:    stage click (same handler) drops visible viewBox IoU
 * twin:    off-screen 2px addMass
 * fail-pass: missing-addMass
 * fail-twin: addmass-offscreen
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail } from "./lib/pack-fail.mjs";
import { LAB_HTML, LAB_MJS, root } from "./lib/pack-paths.mjs";
import { VIEWBOX, iouMasks, rasterRing } from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");
const implPath = twin ? resolve(root, "gates/fixtures/addmass-offscreen.mjs") : resolve(root, LAB_MJS);
const DROP = 0.04;

async function measure(mod) {
  if (typeof mod.addMass !== "function") return { token: "missing-addMass" };
  if (typeof mod.compileSilhouette !== "function") return { token: "missing-addMass", extra: "no compileSilhouette" };
  const before = mod.compileSilhouette(mod.serializeRecipe?.() ?? undefined);
  if (!Array.isArray(before) || before.length < 8) return { token: "missing-addMass", extra: "no ring" };
  const a = rasterRing(before, VIEWBOX);
  mod.addMass(0, 0);
  const after = mod.compileSilhouette(mod.serializeRecipe?.() ?? undefined);
  const b = rasterRing(after, VIEWBOX);
  const iou = iouMasks(a.mask, b.mask);
  return { iou, drop: 1 - iou };
}

if (!existsSync(implPath)) fail(twin ? "missing-twin-fixture" : "missing-addMass");

if (!twin) {
  const html = existsSync(resolve(root, LAB_HTML)) ? readFileSync(resolve(root, LAB_HTML), "utf8") : "";
  const wired = /addMass\s*\(/.test(html);
  if (!wired) fail("missing-addMass", "stage click does not call addMass");
}

const mod = await import(pathToFileURL(implPath).href);
const m = await measure(mod);

if (twin) {
  if (m.token === "missing-addMass") fail("twin-no-addMass");
  if (m.drop < DROP) fail("addmass-offscreen", `drop=${m.drop.toFixed(4)} iou=${m.iou.toFixed(4)}`);
  fail("twin-not-offscreen", `drop=${m.drop.toFixed(4)}`);
}

if (m.token) fail(m.token, m.extra);
if (!(m.drop >= DROP)) fail("missing-addMass", `visible IoU drop ${m.drop.toFixed(4)}`);
console.log(`measured  iou-drop=${m.drop.toFixed(4)}`);
console.log("PASS pack-mass");
