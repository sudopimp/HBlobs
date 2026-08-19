#!/usr/bin/env node
/**
 * G-private
 * file:    src/recipes/* starters (geometry), not a filename
 * pass:    no skull-blob files; no #c1121f bytes in src/; no Firstblood names;
 *          no starter whose fill ΔE vs #c1121f + 3 holes + aspect~0.86 match
 * twin:    gates/fixtures/synth-forbidden.mjs judged as src/recipes/head.js
 * fail-pass: skull-blob-file | firstblood-filename | starter-firstblood | skull-geometry
 * fail-twin: skull-geometry
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const synthPath = resolve(here, "fixtures/synth-forbidden.mjs");

const FIRSTBLOOD = "#c1121f";
const ASPECT_LO = 0.8;
const ASPECT_HI = 0.92;
const HOLE_MARK = 3;
const DE_GEOM = 15;
const DE_STARTER = 8;

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function hexToRgb(hex) {
  const h = String(hex).replace("#", "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToXyz([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const f = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  r = f(r);
  g = f(g);
  b = f(b);
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  ];
}

function xyzToLab([x, y, z]) {
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / 0.95047);
  const fy = f(y / 1);
  const fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return Infinity;
  const A = xyzToLab(rgbToXyz(ra));
  const B = xyzToLab(rgbToXyz(rb));
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

function fillOf(mod, recipe) {
  const raw = recipe?.fill ?? mod?.FILL ?? null;
  return typeof raw === "string" ? raw : null;
}

function holeCount(recipe) {
  const painted = Array.isArray(recipe?.holes) ? recipe.holes.length : 0;
  const body = Array.isArray(recipe?.body) ? recipe.body : [];
  const field = body.filter((n) => n && (n.type === "subtract" || n.type === "smax" || n.type === "hole")).length;
  return painted + field;
}

function bodyAspect(recipe) {
  const body = Array.isArray(recipe?.body) ? recipe.body : [];
  const circles = body.filter((n) => n && n.type === "circle" && Number.isFinite(n.r) && Number.isFinite(n.x) && Number.isFinite(n.y));
  if (!circles.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of circles) {
    minX = Math.min(minX, c.x - c.r);
    maxX = Math.max(maxX, c.x + c.r);
    minY = Math.min(minY, c.y - c.r);
    maxY = Math.max(maxY, c.y + c.r);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (!(h > 0) || !(w > 0)) return null;
  return w / h;
}

function fingerprint(mod, recipe) {
  const fill = fillOf(mod, recipe);
  const holes = holeCount(recipe);
  const aspect = bodyAspect(recipe);
  const de = fill ? deltaE(fill, FIRSTBLOOD) : Infinity;
  return { fill, holes, aspect, de };
}

function isSkullGeometry(fp) {
  return (
    fp.de < DE_GEOM &&
    fp.holes === HOLE_MARK &&
    Number.isFinite(fp.aspect) &&
    fp.aspect >= ASPECT_LO &&
    fp.aspect <= ASPECT_HI
  );
}

function isNearFirstbloodFill(fp) {
  return fp.de < DE_STARTER;
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

async function loadRecipe(file) {
  const mod = await import(pathToFileURL(file).href);
  const recipe = mod.recipe ?? (mod.default && typeof mod.default === "object" && mod.default.body ? mod.default : null);
  return { mod, recipe };
}

if (twin) {
  if (!existsSync(synthPath)) fail("missing-twin-fixture");
  const { mod, recipe } = await loadRecipe(synthPath);
  if (!recipe) fail("twin-not-recipe");
  const asHead = { ...recipe, tag: "head-blob" };
  const fp = fingerprint(mod, asHead);
  if (!isSkullGeometry(fp)) {
    fail(
      "twin-not-skull",
      `aspect=${fp.aspect} holes=${fp.holes} dE=${fp.de.toFixed(3)} (need ~0.86 / 3 / near ${FIRSTBLOOD})`,
    );
  }
  const renamed = fingerprint(mod, { ...asHead, fill: "#c1121e" });
  if (!isSkullGeometry(renamed)) fail("twin-hex-rename-slipped", `dE=${renamed.de.toFixed(3)}`);
  fail(
    "skull-geometry",
    `as=src/recipes/head.js aspect=${fp.aspect.toFixed(3)} holes=${fp.holes} dE=${fp.de.toFixed(3)}`,
  );
}

const srcRoot = resolve(root, "src");
const playground = resolve(root, "playground");
const named = [];
for (const file of [...walk(srcRoot), ...walk(playground)]) {
  const rel = relative(root, file);
  const base = rel.split("/").pop() ?? rel;
  if (/skull-blob/i.test(base) || /skull-blob/i.test(rel)) named.push(["skull-blob-file", rel]);
  if (/firstblood/i.test(base) || /firstblood/i.test(rel)) named.push(["firstblood-filename", rel]);
}
if (named.length) fail(named[0][0], named.map((x) => x[1]).join(" "));

const hexRe = /#c1121f/i;
const hexHits = [];
for (const file of walk(srcRoot)) {
  if (!/\.(js|mjs|cjs|ts|html|css|json|md|svg)$/i.test(file)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (hexRe.test(text)) hexHits.push(relative(root, file));
}
if (hexHits.length) fail("starter-firstblood", hexHits.join(" "));

const recipesDir = resolve(srcRoot, "recipes");
if (existsSync(recipesDir)) {
  for (const file of walk(recipesDir)) {
    if (!/\.(js|mjs)$/i.test(file)) continue;
    const { mod, recipe } = await loadRecipe(file);
    if (!recipe) continue;
    const fp = fingerprint(mod, recipe);
    const rel = relative(root, file);
    if (isSkullGeometry(fp)) {
      fail("skull-geometry", `${rel} aspect=${fp.aspect.toFixed(3)} holes=${fp.holes} dE=${fp.de.toFixed(3)}`);
    }
    if (isNearFirstbloodFill(fp)) {
      fail("starter-firstblood", `${rel} fill=${fp.fill} dE=${fp.de.toFixed(3)}`);
    }
  }
}

console.log("measured  skull-blob=0 firstblood-name=0 starter-hex=0 skull-geometry=0");
console.log("PASS hygiene-private");
