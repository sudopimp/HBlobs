#!/usr/bin/env node
/**
 * G-flat
 * file:    src/pack/recipe.js + src/engine/define-blob.js
 * pass:    any incoming skin/finish is forced flat; engine has no gummy skin branch
 * twin:    gates/fixtures/product-flat-gummy.mjs
 * fail-pass: leftover-gummy
 * fail-twin: leftover-gummy
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
const packed = ensurePackRecipe({
  skin: "gummy",
  finish: "gummy",
  body: [{ type: "circle", id: "a", x: 0, y: 0, r: 40 }],
});

if (twin) {
  if (packed.skin !== "gummy" || packed.finish !== "gummy") {
    fail("twin-not-gummy", `skin=${packed.skin} finish=${packed.finish}`);
  }
  fail("leftover-gummy", `skin=${packed.skin} finish=${packed.finish}`);
}

if (packed.skin !== "flat" || packed.finish !== "flat") {
  fail("leftover-gummy", `skin=${packed.skin} finish=${packed.finish}`);
}

const engine = readFileSync(resolve(root, "src/engine/define-blob.js"), "utf8");
if (/skinAttr === "gummy"|_skin === "gummy"/.test(engine)) {
  fail("leftover-gummy", "engine still has a gummy skin branch");
}

console.log(`measured  skin=${packed.skin} finish=${packed.finish} gummy-branch=0`);
console.log("PASS product-flat");
