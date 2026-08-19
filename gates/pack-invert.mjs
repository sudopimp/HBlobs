#!/usr/bin/env node
/**
 * G-invert (optional)
 * file:    src/pack/invert.js  (does not exist yet)
 * pass:    unknown third raster (2 circles) recovers count + centers
 * twin:    empty / 1-circle / 3-circle against invert-stub
 * fail-pass: missing-invert
 * fail-twin: invert-empty | invert-1circle | invert-3circle
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail, failAll } from "./lib/pack-fail.mjs";
import { INVERT_FILE, root } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";

const twin = process.argv.includes("--twin");
const implPath = twin ? resolve(root, "gates/fixtures/invert-stub.mjs") : resolve(root, INVERT_FILE);

function centersOk(got, want, tol = 6) {
  if (!Array.isArray(got) || got.length !== want.length) return false;
  const used = new Set();
  for (const [x, y] of want) {
    let hit = -1;
    for (let i = 0; i < got.length; i++) {
      if (used.has(i)) continue;
      const gx = got[i]?.[0] ?? got[i]?.x;
      const gy = got[i]?.[1] ?? got[i]?.y;
      if (Math.hypot(gx - x, gy - y) <= tol) {
        hit = i;
        break;
      }
    }
    if (hit < 0) return false;
    used.add(hit);
  }
  return true;
}

function judge(mod, kind, expectCount, expectCenters) {
  const img = decodeImage(synthTmp(kind).path);
  let got;
  try {
    got = mod.invertRaster(img.rgba, img.w, img.h);
  } catch (e) {
    return { ok: false, extra: e?.message ?? e };
  }
  const count = got?.count;
  if (count !== expectCount) return { ok: false, extra: `count=${count}` };
  if (expectCenters && !centersOk(got.centers, expectCenters)) {
    return { ok: false, extra: `centers=${JSON.stringify(got.centers)}` };
  }
  return { ok: true, extra: `count=${count}` };
}

if (!existsSync(implPath)) fail(twin ? "missing-twin-fixture" : "missing-invert");
const mod = await import(pathToFileURL(implPath).href);
if (typeof mod.invertRaster !== "function") fail("invert-not-fn");

if (twin) {
  const tokens = [];
  const empty = judge(mod, "invert-empty", 0, []);
  if (!empty.ok) tokens.push({ token: "invert-empty", extra: empty.extra });
  else tokens.push("twin-not-empty");
  const one = judge(mod, "invert-1", 1, [[32, 32]]);
  if (!one.ok) tokens.push({ token: "invert-1circle", extra: one.extra });
  else tokens.push("twin-not-1circle");
  const three = judge(mod, "invert-3", 3, [
    [12, 30],
    [48, 16],
    [80, 44],
  ]);
  if (!three.ok) tokens.push({ token: "invert-3circle", extra: three.extra });
  else tokens.push("twin-not-3circle");
  failAll(tokens);
}

const two = judge(mod, "invert-2", 2, [
  [18, 32],
  [78, 32],
]);
if (!two.ok) fail("invert-miss", two.extra);
console.log(`measured  invert-2 ${two.extra}`);
console.log("PASS pack-invert");
