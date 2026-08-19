import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { applyLook } from "../engine/looks.js";
import { recipeFromSeed } from "../engine/seed.js";
import { DEFAULT_FILL } from "./const.js";

export const PACK_STATES = {
  idle: {
    turn: -16,
    tilt: -7,
    roll: 12,
    scale: 1.09,
    eyeScale: 1.28,
    gazeX: 0,
    gazeY: 0,
    earL: 1.2,
    earR: 1.18,
    overlay: "none",
  },
  "running-right": {
    turn: 8,
    tilt: 2,
    roll: 4,
    scale: 1.02,
    eyeScale: 1.22,
    gazeX: 10,
    gazeY: 2,
    earL: 1.04,
    earR: 1.28,
    overlay: "none",
  },
  "running-left": {
    turn: -8,
    tilt: 2,
    roll: -4,
    scale: 1.02,
    eyeScale: 1.22,
    gazeX: -10,
    gazeY: 2,
    earL: 1.28,
    earR: 1.04,
    overlay: "none",
  },
  waving: {
    turn: -8,
    tilt: -10,
    roll: 14,
    scale: 1.1,
    eyeScale: 1.3,
    gazeX: 6,
    gazeY: -4,
    earL: 1.42,
    earR: 1.08,
    overlay: "none",
  },
  jumping: {
    turn: -4,
    tilt: -12,
    roll: 6,
    scale: 1.08,
    eyeScale: 1.32,
    gazeX: 0,
    gazeY: -6,
    earL: 1.28,
    earR: 1.28,
    overlay: "none",
  },
  failed: {
    turn: 8,
    tilt: 14,
    roll: -6,
    scale: 0.96,
    eyeScale: 0.72,
    gazeX: 2,
    gazeY: 8,
    earL: 0.94,
    earR: 0.94,
    overlay: "none",
  },
  waiting: {
    turn: -12,
    tilt: 2,
    roll: 8,
    scale: 1.04,
    eyeScale: 1.12,
    gazeX: 4,
    gazeY: 2,
    earL: 1.14,
    earR: 1.2,
    overlay: "none",
  },
  running: {
    turn: 10,
    tilt: 4,
    roll: 6,
    scale: 1.0,
    eyeScale: 1.2,
    gazeX: 12,
    gazeY: 4,
    earL: 0.9,
    earR: 1.4,
    overlay: "none",
  },
  review: {
    turn: -20,
    tilt: -4,
    roll: 4,
    scale: 1.06,
    eyeScale: 1.18,
    gazeX: 8,
    gazeY: -2,
    earL: 1.1,
    earR: 1.22,
    overlay: "none",
  },
};

const HEX6 = /^#?([0-9a-fA-F]{6})$/;
const HEX3 = /^#?([0-9a-fA-F]{3})$/;

export function parseFill(raw) {
  const s = String(raw ?? "").trim();
  const m6 = s.match(HEX6);
  if (m6) return `#${m6[1].toLowerCase()}`;
  const m3 = s.match(HEX3);
  if (m3) {
    const [r, g, b] = m3[1].toLowerCase().split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function lumaHex(hex) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function hexToRgba(hex, a = 255) {
  const n = String(hex).replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), a];
}

export function ensurePackRecipe(recipe) {
  const next = JSON.parse(JSON.stringify(recipe ?? {}));
  next.schemaVersion = next.schemaVersion ?? 0;
  next.tag = next.tag || "hblob-pet";
  next.finish = "flat";
  next.skin = "flat";
  next.face = {
    size: 1.28,
    gap: 2.55,
    height: 1,
    eyeWidth: 0.82,
    eyeHeight: 1.32,
    ...(next.face ?? {}),
  };
  next.states = { ...PACK_STATES, ...(next.states ?? {}) };
  if (!next.fill || lumaHex(next.fill) < 50) next.fill = DEFAULT_FILL;
  if (!Array.isArray(next.body) || next.body.length === 0) {
    next.body = [
      { type: "circle", id: "head", x: 0, y: 4, r: 64 },
      { type: "circle", id: "belly", x: 0, y: 22, r: 62 },
      { type: "circle", id: "earL", x: -50, y: -58, r: 18 },
      { type: "circle", id: "earR", x: 50, y: -58, r: 18 },
      { type: "smin", id: "mass", a: "head", b: "belly", k: 32 },
      { type: "smin", id: "ears", a: "earL", b: "earR", k: 5 },
      { type: "smin", id: "body", a: "mass", b: "ears", k: 5 },
    ];
  }
  return next;
}

export function recipePath(packDir) {
  return join(packDir, "recipe.json");
}

export function loadRecipe(packDir) {
  const p = recipePath(packDir);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function saveRecipe(packDir, recipe) {
  mkdirSync(packDir, { recursive: true });
  writeFileSync(recipePath(packDir), `${JSON.stringify(recipe, null, 2)}\n`);
}

export function workingRecipe(packDir, seed = "hblob") {
  return ensurePackRecipe(loadRecipe(packDir) ?? recipeFromSeed(seed));
}

export function applyColor(recipe, token) {
  const hex = parseFill(token);
  if (hex) {
    const next = JSON.parse(JSON.stringify(recipe));
    next.fill = lumaHex(hex) < 50 ? DEFAULT_FILL : hex;
    return next;
  }
  return ensurePackRecipe(applyLook(recipe, token));
}

export function petMeta(recipe) {
  const raw = String(recipe.tag || "hblob").replace(/-blob$/, "");
  const id = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "hblob";
  return {
    id,
    displayName: id === "seed" ? "HBlob" : id.replace(/(^|-)([a-z])/g, (_, a, c) => (a ? " " : "") + c.toUpperCase()),
    description: "A living SDF blob pet for Hermes Agent.",
    spritesheetPath: "spritesheet.webp",
  };
}

export function writePetJson(packDir, recipe) {
  mkdirSync(dirname(join(packDir, "pet.json")), { recursive: true });
  writeFileSync(join(packDir, "pet.json"), `${JSON.stringify(petMeta(recipe), null, 2)}\n`);
}
