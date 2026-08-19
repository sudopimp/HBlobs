import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const here = dirname(fileURLToPath(import.meta.url));
export const gatesDir = resolve(here, "..");
export const root = resolve(gatesDir, "..");

export const PACK_DIRS = [
  "dist/pack",
  "out/pack",
  "export/pack",
  "pack",
  "playground/pack",
];

export const SHEET_NAMES = ["spritesheet.webp", "spritesheet.png"];

export const MAP_FILE = "src/pack/map.js";
export const INVERT_FILE = "src/pack/invert.js";
export const PREVIEW_FILE = "dist/pack/preview-idle.png";
export const LAB_HTML = "playground/lab.html";
export const LAB_MJS = "playground/lab.mjs";

export const HERMES_AGENT_ROOT =
  process.env.HERMES_AGENT_ROOT || "/home/fer/.hermes/hermes-agent";

export function findPackDir(base = root) {
  for (const rel of PACK_DIRS) {
    const dir = resolve(base, rel);
    if (!existsSync(dir)) continue;
    if (SHEET_NAMES.some((n) => existsSync(join(dir, n))) || existsSync(join(dir, "pet.json"))) {
      return dir;
    }
  }
  return null;
}

export function findSheet(dir) {
  if (!dir) return null;
  for (const n of SHEET_NAMES) {
    const p = join(dir, n);
    if (existsSync(p)) return p;
  }
  return null;
}

export function webpPath(dir) {
  return dir ? join(dir, "spritesheet.webp") : null;
}
