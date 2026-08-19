#!/usr/bin/env node
/**
 * G-prim
 * file:    src/engine/define-blob.js  (capsule + rbox compile — not on today's tree)
 * pass:    2× capsule + smin traces a stadium ring; rbox compiles; unknown type throws
 * twin:    gates/fixtures/capsule-as-circle.mjs
 * fail-pass: no-capsule | capsule-no-ring | capsule-aliased-circle | no-rbox | unknown-type-accepted
 * fail-twin: capsule-aliased-circle (circle-like ring from midpoint alias)
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { elongation } from "./lib/sota-metrics.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const implPath = twin
  ? resolve(here, "fixtures/capsule-as-circle.mjs")
  : resolve(root, "src/engine/define-blob.js");

const STADIUM_MIN = 1.8;
const MIN_POINTS = 64;

const PILL = {
  schemaVersion: 0,
  tag: "sota-stad-pill",
  fill: "#5ad4c8",
  body: [
    { type: "capsule", id: "stad-a", ax: -42, ay: 0, bx: 42, by: 0, r: 20 },
    { type: "capsule", id: "stad-b", ax: -36, ay: 4, bx: 36, by: 4, r: 18 },
    { type: "smin", id: "stad-mass", a: "stad-a", b: "stad-b", k: 14 },
  ],
  states: { idle: {} },
};

const RBOX = {
  schemaVersion: 0,
  tag: "sota-rbox",
  fill: "#5ad4c8",
  body: [{ type: "rbox", id: "box-a", x: 0, y: 0, w: 90, h: 34, r: 8 }],
  states: { idle: {} },
};

const UNKNOWN = {
  schemaVersion: 0,
  tag: "sota-unknown",
  fill: "#5ad4c8",
  body: [{ type: "prismoid-9f3", id: "nope", x: 0, y: 0, r: 1 }],
  states: { idle: {} },
};

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

if (!existsSync(implPath)) fail(twin ? "missing-twin-fixture" : "missing-define-blob");

const mod = await import(pathToFileURL(implPath).href);
if (typeof mod.defineBlob !== "function") fail("defineBlob-not-fn");

if (twin) {
  let api;
  try {
    api = mod.defineBlob(PILL);
  } catch (e) {
    fail("twin-rejected-capsule", e?.message ?? e);
  }
  if (!api || typeof api.silhouette !== "function") fail("twin-no-silhouette");
  const ring = api.silhouette();
  if (!Array.isArray(ring) || ring.length < MIN_POINTS) fail("twin-no-ring");
  const e = elongation(ring);
  if (e >= STADIUM_MIN) fail("twin-not-aliased", `elongation=${e.toFixed(3)}`);
  fail("capsule-aliased-circle", `elongation=${e.toFixed(3)}`);
}

let api;
try {
  api = mod.defineBlob(PILL);
} catch (e) {
  fail("no-capsule", e?.message ?? e);
}

if (!api || typeof api.silhouette !== "function") fail("capsule-no-ring", "silhouette() missing");
let ring;
try {
  ring = api.silhouette();
} catch (e) {
  fail("no-capsule", e?.message ?? e);
}
if (!Array.isArray(ring) || ring.length < MIN_POINTS) {
  fail("capsule-no-ring", `points=${ring?.length}`);
}
for (const p of ring) {
  if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
    fail("capsule-no-ring", "non-finite point");
  }
}

const e = elongation(ring);
if (!(e >= STADIUM_MIN)) {
  fail("capsule-aliased-circle", `elongation=${e.toFixed(3)} need>=${STADIUM_MIN}`);
}

try {
  const boxApi = mod.defineBlob(RBOX);
  if (typeof boxApi?.silhouette === "function") boxApi.silhouette();
} catch (err) {
  fail("no-rbox", err?.message ?? err);
}

let unknownThrew = false;
try {
  const bad = mod.defineBlob(UNKNOWN);
  if (typeof bad?.silhouette === "function") bad.silhouette();
} catch {
  unknownThrew = true;
}
if (!unknownThrew) fail("unknown-type-accepted");

console.log(`measured  points=${ring.length} elongation=${e.toFixed(3)}`);
console.log("PASS sota-prim");
