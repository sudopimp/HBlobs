/**
 * Live studio — mounts defineBlob. Browser-only. No Node imports.
 * Looks and colors go through applyLook (unknown tokens throw).
 */
import { defineBlob } from "../src/engine/define-blob.js";
import { FACE } from "../src/engine/face.js";
import { applyLook } from "../src/engine/looks.js";

export const COLORS = ["pink", "teal", "purple", "yellow", "blue", "orange"];
export const LOOKS = ["fatter", "thinner", "taller", "melt"];
export const STATES = [
  "idle",
  "waving",
  "jumping",
  "waiting",
  "running",
  "review",
  "failed",
];

const POSES = {
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
    bounce: 0.8,
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
    shake: 0.35,
  },
};

const GUMMY_BODY = [
  { type: "circle", id: "head", x: 0, y: 4, r: 64 },
  { type: "circle", id: "belly", x: 0, y: 22, r: 62 },
  { type: "circle", id: "earL", x: -50, y: -58, r: 18 },
  { type: "circle", id: "earR", x: 50, y: -58, r: 18 },
  { type: "smin", id: "mass", a: "head", b: "belly", k: 32 },
  { type: "smin", id: "ears", a: "earL", b: "earR", k: 5 },
  { type: "smin", id: "body", a: "mass", b: "ears", k: 5 },
];

let seq = 0;

export function baseRecipe() {
  return {
    schemaVersion: 0,
    tag: "studio-blob",
    fill: "#e84a9a",
    finish: "gummy",
    skin: "gummy",
    face: { ...FACE },
    states: structuredClone(POSES),
    body: structuredClone(GUMMY_BODY),
  };
}

export function mountBlob(host, recipe, { size = 420, state = "idle", follow = false } = {}) {
  const tag = `studio-blob-${++seq}`;
  const next = {
    ...recipe,
    tag,
    finish: "gummy",
    skin: "gummy",
    face: { ...FACE, ...(recipe.face ?? {}) },
    states: { ...POSES, ...(recipe.states ?? {}) },
  };
  defineBlob(next);
  const el = document.createElement(tag);
  el.setAttribute("skin", "gummy");
  el.setAttribute("size", String(size));
  el.setAttribute("state", POSES[state] ? state : "idle");
  if (follow) el.setAttribute("follow", "");
  host.replaceChildren(el);
  return el;
}

export function tint(recipe, token) {
  return applyLook(recipe, token);
}

export function sculpt(recipe, token) {
  return applyLook(recipe, token);
}
