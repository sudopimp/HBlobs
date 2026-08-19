#!/usr/bin/env node
/**
 * G-flat
 * file:    src/pack/recipe.js + src/engine/define-blob.js
 * pass:    omitted finish/skin → flat; missing skin attr → flat
 * twin:    gates/fixtures/product-flat-gummy.mjs
 * fail-pass: default-gummy
 * fail-twin: default-gummy
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

const recipePath = twin
  ? resolve(here, "fixtures/product-flat-gummy.mjs")
  : resolve(root, "src/pack/recipe.js");

const { ensurePackRecipe } = await import(pathToFileURL(recipePath).href);
const packed = ensurePackRecipe({ body: [{ type: "circle", id: "a", x: 0, y: 0, r: 40 }] });

if (twin) {
  if (packed.skin !== "gummy" || packed.finish !== "gummy") {
    fail("twin-not-gummy", `skin=${packed.skin} finish=${packed.finish}`);
  }
  fail("default-gummy", `skin=${packed.skin} finish=${packed.finish}`);
}

if (packed.skin !== "flat" || packed.finish !== "flat") {
  fail("default-gummy", `skin=${packed.skin} finish=${packed.finish}`);
}

const engine = readFileSync(resolve(root, "src/engine/define-blob.js"), "utf8");
if (!/this\._skin = "flat"/.test(engine)) fail("default-gummy", "element default is not flat");
if (!/skinAttr === "gummy"/.test(engine)) fail("default-gummy", "gummy is not opt-in");

console.log(`measured  skin=${packed.skin} finish=${packed.finish}`);
console.log("PASS product-flat");
