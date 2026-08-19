#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyLook } from "../src/engine/looks.js";
import { recipeFromSeed } from "../src/engine/seed.js";
import { exportPack } from "../src/pack/export.js";
import { applyColor, ensurePackRecipe, saveRecipe, workingRecipe } from "../src/pack/recipe.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PACK = join(root, "dist/pack");

function packDirFrom(args) {
  const i = args.indexOf("--out");
  if (i >= 0 && args[i + 1]) return resolve(root, args[i + 1]);
  const positional = args.find((a) => a && !a.startsWith("-"));
  return positional ? resolve(root, positional) : DEFAULT_PACK;
}

function cmdNew(args) {
  let seed = "hblob";
  const i = args.indexOf("--seed");
  if (i >= 0 && args[i + 1]) seed = args[i + 1];
  const recipe = ensurePackRecipe(recipeFromSeed(seed));
  saveRecipe(DEFAULT_PACK, recipe);
  console.log(`recipe seed=${seed} fill=${recipe.fill}`);
}

function cmdColor(args) {
  const token = args[0];
  if (!token) {
    console.error("usage: hblobs color <hex|name>");
    process.exit(2);
  }
  const recipe = applyColor(workingRecipe(DEFAULT_PACK), token);
  saveRecipe(DEFAULT_PACK, recipe);
  console.log(`fill=${recipe.fill}`);
}

function cmdFatter() {
  const recipe = ensurePackRecipe(applyLook(workingRecipe(DEFAULT_PACK), "fatter"));
  saveRecipe(DEFAULT_PACK, recipe);
  console.log("look=fatter");
}

function cmdExport(args) {
  const dir = packDirFrom(args);
  const recipe = workingRecipe(dir === DEFAULT_PACK ? DEFAULT_PACK : dir);
  const out = exportPack(dir, recipe);
  console.log(`export ${out.packDir} id=${out.meta.id}`);
}

function cmdAdopt(args) {
  // do not call hermes pets install — copy the pack into $HERMES_HOME/pets/<slug>/
  const dir = DEFAULT_PACK;
  if (!existsSync(join(dir, "spritesheet.webp"))) {
    const recipe = workingRecipe(dir);
    exportPack(dir, recipe);
  }
  const metaPath = join(dir, "pet.json");
  const slug = args[0] || (existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")).id : "hblob");
  const home = process.env.HERMES_HOME || join(homedir(), ".hermes");
  const dest = join(home, "pets", slug);
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    copyFileSync(join(dir, name), join(dest, name));
  }
  console.log(`adopt ${dest}`);
}

const commands = {
  new: cmdNew,
  color: cmdColor,
  fatter: cmdFatter,
  export: cmdExport,
  adopt: cmdAdopt,
};

const verb = process.argv[2];
const fn = commands[verb];
if (!fn) {
  console.error("usage: hblobs <new|color|fatter|export|adopt>");
  process.exit(2);
}
fn(process.argv.slice(3));
