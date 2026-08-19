/**
 * Live studio — mounts defineBlob. Browser-only.
 */
import { defineBlob } from "../src/engine/define-blob.js";
import { FACE } from "../src/engine/face.js";
import { applyLook } from "../src/engine/looks.js";
import { PRODUCT_POSES, STATE_GROUPS } from "../src/engine/poses.js";

export { STATE_GROUPS };
export const COLORS = ["pink", "teal", "purple", "yellow", "blue", "orange"];
export const LOOKS = ["fatter", "thinner", "taller", "melt"];
export const STATES = Object.keys(PRODUCT_POSES);

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
    finish: "flat",
    skin: "flat",
    face: { ...FACE },
    states: structuredClone(PRODUCT_POSES),
    body: structuredClone(GUMMY_BODY),
  };
}

export function mountBlob(host, recipe, { size = 420, state = "idle", follow = false, skin = "flat" } = {}) {
  const tag = `studio-blob-${++seq}`;
  const next = {
    ...recipe,
    tag,
    finish: skin === "gummy" ? "gummy" : "flat",
    skin,
    face: { ...FACE, ...(recipe.face ?? {}) },
    states: { ...PRODUCT_POSES, ...(recipe.states ?? {}) },
  };
  defineBlob(next);
  const el = document.createElement(tag);
  el.setAttribute("skin", skin === "gummy" ? "gummy" : "flat");
  el.setAttribute("size", String(size));
  el.setAttribute("state", PRODUCT_POSES[state] ? state : "idle");
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
