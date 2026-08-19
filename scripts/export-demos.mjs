#!/usr/bin/env node
/** One-shot: write variant packs for demo GIFs. Does not touch dist/pack. */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyLook } from "../src/engine/looks.js";
import { exportPack } from "../src/pack/export.js";
import { applyColor, ensurePackRecipe } from "../src/pack/recipe.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = ensurePackRecipe(JSON.parse(readFileSync(join(root, "dist/pack/recipe.json"), "utf8")));
const outRoot = process.argv[2] || "/tmp/hblobs-demo-packs";
mkdirSync(outRoot, { recursive: true });

const variants = {
  gummy: base,
  chubby: applyLook(base, "fatter"),
  teal: applyColor(base, "teal"),
  melt: applyColor(applyLook(base, "melt"), "purple"),
};

for (const [name, recipe] of Object.entries(variants)) {
  const tagged = { ...recipe, tag: `${name}-blob` };
  const dir = join(outRoot, name);
  const out = exportPack(dir, tagged);
  console.log(`demo ${name} ${out.packDir}`);
}
