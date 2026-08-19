#!/usr/bin/env node
/**
 * G-gaze-held: idle without follow, |gaze| < ε over N steps.
 * PASS reads the live wander in define-blob.js (today ±4).
 * Twin: current wander formula as a fixture.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail, isTwin, read, root, wanderAmps } from "./lib/craft-util.mjs";

const twin = isTwin();
const EPS = 0.5;
const N = 16;

if (twin) {
  const { idleGazeTarget } = await import(pathToFileURL(resolve(root, "gates/fixtures/gaze-wander.mjs")).href);
  const pose = { gazeX: 0, gazeY: 0 };
  for (let i = 0; i < N; i++) {
    const g = idleGazeTarget(pose, 1, 1);
    if (Math.abs(g.x) >= EPS || Math.abs(g.y) >= EPS) {
      fail("wander-pm4", `step=${i} gaze=${g.x},${g.y}`);
    }
  }
  fail("wander-pm4", "twin wander stayed inside ε");
}

const src = read(resolve(root, "src/engine/define-blob.js"));
const amp = wanderAmps(src);
console.log(`measured  wanderAmp x=${amp.x} y=${amp.y} steps=${N} eps=${EPS}`);

const series = [];
let gazeX = 0;
let gazeY = 0;
for (let i = 0; i < N; i++) {
  const tx = Number.isFinite(amp.x) ? amp.x : 0;
  const ty = Number.isFinite(amp.y) ? amp.y : 0;
  gazeX += (tx - gazeX) * 1;
  gazeY += (ty - gazeY) * 1;
  series.push({ gazeX, gazeY });
  if (Math.abs(gazeX) >= EPS || Math.abs(gazeY) >= EPS) fail("gaze-wander", `step=${i} gaze=${gazeX},${gazeY}`);
}

console.log("PASS craft-gaze-held");
