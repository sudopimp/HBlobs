import { bbox } from "./shape-metrics.mjs";

/** max(w,h)/min(w,h). A circle is ~1; a stadium pill is ≳2. */
export function elongation(ring) {
  const box = bbox(ring);
  const long = Math.max(box.w, box.h);
  const short = Math.min(box.w, box.h);
  if (!(short > 0) || !Number.isFinite(long)) return 0;
  return long / short;
}

export function circleRing(cx, cy, r, n = 128) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}

export function maxMassR(recipe) {
  let best = -Infinity;
  for (const op of recipe?.body ?? []) {
    if (Number.isFinite(op.r)) best = Math.max(best, op.r);
  }
  for (const v of Object.values(recipe?.params ?? {})) {
    if (Number.isFinite(v)) best = Math.max(best, v);
  }
  return best;
}

export function recipeBytes(recipe) {
  return JSON.stringify(recipe);
}

export function resolveSdf(api) {
  if (api && typeof api.sdf === "function") return api.sdf.bind(api);
  if (api && typeof api.evaluate === "function") return api.evaluate.bind(api);
  if (api && typeof api.sample === "function") return api.sample.bind(api);
  if (api && typeof api.sdfFor === "function") {
    const fn = api.sdfFor();
    if (typeof fn === "function") return fn;
  }
  return null;
}
