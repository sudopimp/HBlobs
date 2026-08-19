import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOLE } from "./const.js";
import { buildEngineFrames } from "./engine-frame.js";
import { hexToRgba, petMeta, saveRecipe, writePetJson } from "./recipe.js";

const here = dirname(fileURLToPath(import.meta.url));
const WRITER = join(here, "write-atlas.py");

export function exportPack(packDir, recipe) {
  mkdirSync(packDir, { recursive: true });
  saveRecipe(packDir, recipe);
  writePetJson(packDir, recipe);

  const spec = {
    fill: hexToRgba(recipe.fill),
    hole: hexToRgba(HOLE),
    outDir: packDir,
    cells: buildEngineFrames(recipe),
  };

  const r = spawnSync("python3", [WRITER], {
    input: JSON.stringify(spec),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || `write-atlas exit ${r.status}`).trim());
  }
  return {
    packDir,
    meta: petMeta(recipe),
    raster: r.stdout ? JSON.parse(r.stdout) : null,
  };
}
