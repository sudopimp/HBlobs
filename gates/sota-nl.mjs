#!/usr/bin/env node
/**
 * G-nl
 * file:    src/engine/looks.js  (does not exist yet)
 * pass:    applyLook(recipe, "fatter") grows a mass r by more than noise;
 *          "goth-cyber" throws FAIL unknown-look and writes no pack;
 *          an eval probe must not execute
 * twin:    gates/fixtures/eval-looks.mjs
 * fail-pass: missing-looks | looks-api | fatter-noop | unknown-look-accepted |
 *            unknown-look-silent | unknown-look-wrote-pack | nl-evals-prompt
 * fail-twin: nl-evals-prompt (eval of the prompt string)
 */
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { maxMassR } from "./lib/sota-metrics.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const implPath = twin ? resolve(here, "fixtures/eval-looks.mjs") : resolve(root, "src/engine/looks.js");

const FATTER_DELTA = 1.5;
const EVAL_PROBE = "globalThis.__hblobsNlEval=1";

const BASE = {
  schemaVersion: 0,
  tag: "sota-nl-probe",
  fill: "#5ad4c8",
  body: [{ type: "circle", id: "mass", x: 0, y: 0, r: 40 }],
  states: { idle: {} },
};

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function resolveLookFn(mod) {
  const fn =
    mod.applyLook ??
    mod.applyAdjective ??
    mod.look ??
    (typeof mod.default === "function" ? mod.default : null);
  if (typeof fn !== "function") fail("looks-api");
  return fn;
}

function packArtifacts(dir) {
  if (!dir || !existsSync(dir)) return [];
  const names = readdirSync(dir);
  return names.filter((n) => n === "pet.json" || n === "spritesheet.webp" || n === "spritesheet.png");
}

if (!existsSync(implPath)) fail(twin ? "missing-twin-fixture" : "missing-looks");

const mod = await import(pathToFileURL(implPath).href);
const applyLook = resolveLookFn(mod);

if (twin) {
  globalThis.__hblobsNlEval = 0;
  try {
    await Promise.resolve(applyLook(structuredClone(BASE), EVAL_PROBE));
  } catch {
    // eval may throw; the marker is the claim
  }
  if (globalThis.__hblobsNlEval === 1) fail("nl-evals-prompt");
  fail("twin-did-not-eval");
}

globalThis.__hblobsNlEval = 0;
try {
  await Promise.resolve(applyLook(structuredClone(BASE), EVAL_PROBE));
} catch {
  // unknown token must throw, not execute
}
if (globalThis.__hblobsNlEval === 1) fail("nl-evals-prompt");

const before = structuredClone(BASE);
const after = await Promise.resolve(applyLook(structuredClone(BASE), "fatter"));
if (after == null || typeof after !== "object") fail("fatter-noop", "no recipe returned");
const r0 = maxMassR(before);
const r1 = maxMassR(after);
if (!(r1 - r0 > FATTER_DELTA)) {
  fail("fatter-noop", `Δr=${r1 - r0}`);
}

const tmp = mkdtempSync(join(tmpdir(), "hblobs-nl-"));
const opts = { outDir: tmp, packDir: tmp, dest: tmp, out: tmp };
let unknownErr;
try {
  await Promise.resolve(applyLook(structuredClone(BASE), "goth-cyber", opts));
} catch (e) {
  unknownErr = e;
}
if (!unknownErr) fail("unknown-look-accepted");
const text = String(unknownErr?.message ?? unknownErr);
if (!/FAIL unknown-look/.test(text)) fail("unknown-look-silent", text);
const written = packArtifacts(tmp);
if (written.length) fail("unknown-look-wrote-pack", written.join(","));

console.log(`measured  fatter Δr=${(r1 - r0).toFixed(3)}`);
console.log("PASS sota-nl");
