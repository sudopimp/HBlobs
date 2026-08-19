#!/usr/bin/env node
/**
 * G-idle-lean: paused idle |turn|≥8, |tilt|≥3, |roll|≥4, eyeScale≥1.28, gaze=0.
 * PASS measures poseDefaults merge on an idle recipe that does not set lean.
 * Twin: lab rotate(-8) wrapper.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  fail,
  isTwin,
  parsePoseDefaults,
  previewRootRotate,
  read,
  root,
} from "./lib/craft-util.mjs";

const twin = isTwin();

if (twin) {
  const html = read(resolve(root, "gates/fixtures/lab-rotate-idle.html"));
  if (previewRootRotate(html) || /rotate\(\s*-8\s*\)/.test(html)) {
    fail("lab-rotate", "preview root uses rotate(-8)");
  }
  fail("lab-rotate", "twin fixture lost its rotate(-8)");
}

const src = read(resolve(root, "src/engine/define-blob.js"));
const defaults = parsePoseDefaults(src);
if (!defaults) fail("idle-lean-zero", "poseDefaults not found");

const { defineBlob } = await import(pathToFileURL(resolve(root, "src/engine/define-blob.js")).href);
const api = defineBlob({
  tag: "craft-lean",
  body: [
    { type: "circle", id: "a", x: 0, y: 0, r: 50 },
    { type: "circle", id: "b", x: 0, y: 16, r: 44 },
    { type: "smin", id: "m", a: "a", b: "b", k: 18 },
  ],
  states: { idle: {} },
});
const raw = api.targetsFor("idle");
const idle = { ...defaults, ...raw };

console.log(
  `measured  turn=${idle.turn} tilt=${idle.tilt} roll=${idle.roll} eyeScale=${idle.eyeScale} gazeX=${idle.gazeX} gazeY=${idle.gazeY}`,
);

if (
  Math.abs(idle.turn) < 8 ||
  Math.abs(idle.tilt) < 3 ||
  Math.abs(idle.roll) < 4 ||
  idle.eyeScale < 1.28 ||
  Math.abs(idle.gazeX) > 1e-6 ||
  Math.abs(idle.gazeY) > 1e-6
) {
  fail(
    "idle-lean-zero",
    `turn=${idle.turn} tilt=${idle.tilt} roll=${idle.roll} eyeScale=${idle.eyeScale} gaze=${idle.gazeX},${idle.gazeY}`,
  );
}

console.log("PASS craft-idle-lean");
