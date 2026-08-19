#!/usr/bin/env node
/**
 * G-contain: eyeClearance ≥ 6 on idle / run / failed.
 * PASS uses the maker recipe through defineBlob (today: no run/failed states).
 * Twin: holes that poke the ring.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { eyeClearance } from "./lib/face-metrics.mjs";
import { fail, isTwin, parseEyeEllipses, read, root } from "./lib/craft-util.mjs";

const twin = isTwin();
const MIN = 6;

if (twin) {
  const poke = await import(pathToFileURL(resolve(root, "gates/fixtures/poke-eyes.mjs")).href);
  const geo = poke.faceGeometry();
  const holes = [...geo.eyes, ...(geo.holes ?? [])];
  let worst = Infinity;
  for (const h of holes) {
    const c = eyeClearance(h, geo.ring);
    if (c < worst) worst = c;
  }
  if (worst < MIN) fail("poke-ring", `clearance=${worst.toFixed(2)}`);
  fail("poke-ring", "twin holes stayed inside the ring");
}

const { defineBlob } = await import(pathToFileURL(resolve(root, "src/engine/define-blob.js")).href);
const { applyTemplate, compileSilhouette, serializeRecipe } = await import(
  pathToFileURL(resolve(root, "playground/lab.mjs")).href
);
applyTemplate("gummy");
const recipe = serializeRecipe();
const labEyes = parseEyeEllipses(read(resolve(root, "playground/lab.html")));
const labRing = compileSilhouette(recipe);
const STATES = labEyes.length === 2 ? ["run", "failed"] : ["idle", "run", "failed"];
if (labEyes.length === 2) {
  for (const [name, eye] of [
    ["left", labEyes[0]],
    ["right", labEyes[1]],
  ]) {
    const c = eyeClearance(eye, labRing);
    console.log(`measured  lab-idle ${name} clearance=${c.toFixed(2)}`);
    if (c < MIN) fail("eye-clearance", `lab-idle ${name} ${c.toFixed(2)}`);
  }
}

const api = defineBlob({
  tag: "craft-contain",
  body: recipe.body,
  face: recipe.face,
  states: recipe.states ?? {},
});

for (const state of STATES) {
  let geo;
  try {
    geo = api.faceGeometry(state, { gaze: 0 });
  } catch {
    fail(state === "idle" ? "missing-idle" : state === "run" ? "missing-run" : "missing-failed");
  }
  if (!geo?.ring || !Array.isArray(geo.eyes) || geo.eyes.length !== 2) {
    fail("missing-eyes", state);
  }
  for (const [name, eye] of [
    ["left", geo.eyes[0]],
    ["right", geo.eyes[1]],
  ]) {
    const c = eyeClearance(eye, geo.ring);
    console.log(`measured  ${state} ${name} clearance=${c.toFixed(2)}`);
    if (c < MIN) fail("eye-clearance", `${state} ${name} ${c.toFixed(2)}`);
  }
}

console.log("PASS craft-contain");
