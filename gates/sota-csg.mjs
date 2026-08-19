#!/usr/bin/env node
/**
 * G-csg
 * file:    src/engine/define-blob.js  (subtract/smax — not on today's tree)
 * pass:    subtract a concentric circle; field at the cut is air; ≥1 bounded hole
 * twin:    gates/fixtures/painted-hole.mjs
 * fail-pass: no-subtract | no-sdf-eval | no-hole-in-field | painted-hole-not-sdf
 * fail-twin: painted-hole-not-sdf (data-hole / recipe.holes, field unchanged)
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { holeCount, paintedHoles } from "./lib/field-metrics.mjs";
import { resolveSdf } from "./lib/sota-metrics.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const implPath = twin
  ? resolve(here, "fixtures/painted-hole.mjs")
  : resolve(root, "src/engine/define-blob.js");

const BODY = {
  schemaVersion: 0,
  tag: "sota-csg-body",
  fill: "#5ad4c8",
  body: [{ type: "circle", id: "body", x: 0, y: 0, r: 50 }],
  states: { idle: {} },
};

const CUT = {
  schemaVersion: 0,
  tag: "sota-csg-cut",
  fill: "#5ad4c8",
  body: [
    { type: "circle", id: "body", x: 0, y: 0, r: 50 },
    { type: "circle", id: "cut", x: 0, y: 0, r: 18 },
    { type: "subtract", id: "mass", a: "body", b: "cut" },
  ],
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
    api = mod.defineBlob(CUT);
  } catch (e) {
    fail("twin-rejected-subtract", e?.message ?? e);
  }
  const sdf = resolveSdf(api);
  if (!sdf) fail("twin-no-sdf-eval");
  const at = sdf(0, 0);
  const holes = holeCount(sdf);
  const painted = paintedHoles(api);
  if (at > 0 || holes >= 1) fail("twin-cut-for-real", `sdf0=${at} holes=${holes}`);
  if (!painted.length) fail("twin-not-painted");
  fail("painted-hole-not-sdf", `sdf0=${at} fieldHoles=${holes} painted=${painted.length}`);
}

let cutApi;
try {
  cutApi = mod.defineBlob(CUT);
} catch (e) {
  fail("no-subtract", e?.message ?? e);
}

function compileThrew(err) {
  const msg = String(err?.message ?? err);
  if (/subtract|smax|unknown/i.test(msg)) fail("no-subtract", msg);
  fail("no-subtract", msg);
}

let sdf = resolveSdf(cutApi);
if (!sdf && typeof cutApi?.silhouette === "function") {
  try {
    cutApi.silhouette();
  } catch (e) {
    compileThrew(e);
  }
}
if (!sdf) fail("no-sdf-eval");

let at;
let holes;
try {
  at = sdf(0, 0);
  holes = holeCount(sdf);
} catch (e) {
  compileThrew(e);
}
const painted = paintedHoles(cutApi);

if (!(at > 4) || holes < 1) {
  if (painted.length) fail("painted-hole-not-sdf", `sdf0=${at} fieldHoles=${holes}`);
  fail("no-hole-in-field", `sdf0=${at} fieldHoles=${holes}`);
}

if (typeof mod.defineBlob === "function") {
  try {
    const base = mod.defineBlob(BODY);
    const baseSdf = resolveSdf(base);
    if (baseSdf) {
      const baseAt = baseSdf(0, 0);
      const baseHoles = holeCount(baseSdf);
      if (!(baseAt < 0) || baseHoles !== 0) {
        fail("no-hole-in-field", `baseline sdf0=${baseAt} holes=${baseHoles} (need solid disk)`);
      }
    }
  } catch {
    // baseline circle must already compile on this tree; ignore only if BODY is rejected
  }
}

console.log(`measured  sdf0=${at.toFixed(3)} fieldHoles=${holes}`);
console.log("PASS sota-csg");
