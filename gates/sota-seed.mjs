#!/usr/bin/env node
/**
 * G-seed
 * file:    src/engine/seed.js  (does not exist yet)
 * pass:    recipeFromSeed("sota-demo") twice → identical JSON bytes, non-empty body
 * twin:    gates/fixtures/random-seed.mjs
 * fail-pass: missing-seed | seed-api | seed-empty-body | seed-nondeterministic
 * fail-twin: seed-nondeterministic (Math.random dice)
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { recipeBytes } from "./lib/sota-metrics.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const implPath = twin ? resolve(here, "fixtures/random-seed.mjs") : resolve(root, "src/engine/seed.js");

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function resolveSeedFn(mod) {
  const fn =
    mod.recipeFromSeed ??
    mod.fromSeed ??
    mod.dice ??
    (typeof mod.default === "function" ? mod.default : null);
  if (typeof fn !== "function") fail("seed-api");
  return fn;
}

if (!existsSync(implPath)) fail(twin ? "missing-twin-fixture" : "missing-seed");

const mod = await import(pathToFileURL(implPath).href);
const fromSeed = resolveSeedFn(mod);

const a = await Promise.resolve(fromSeed("sota-demo"));
const b = await Promise.resolve(fromSeed("sota-demo"));

if (a == null || typeof a !== "object") fail("seed-empty-body", "first draw is not a recipe");
if (b == null || typeof b !== "object") fail("seed-empty-body", "second draw is not a recipe");
if (!Array.isArray(a.body) || a.body.length === 0) fail("seed-empty-body");
if (!Array.isArray(b.body) || b.body.length === 0) fail("seed-empty-body");

const ba = recipeBytes(a);
const bb = recipeBytes(b);
if (typeof ba !== "string" || typeof bb !== "string") fail("seed-empty-body", "not JSON");

if (twin) {
  if (ba === bb) fail("twin-was-deterministic");
  fail("seed-nondeterministic");
}

if (ba !== bb) fail("seed-nondeterministic");

console.log(`measured  bytes=${ba.length} seed=sota-demo`);
console.log("PASS sota-seed");
