/**
 * Known-bad impl: every `capsule` is a circle at the segment midpoint.
 * G-prim --twin must reject this with FAIL capsule-aliased-circle.
 */
import { circleRing } from "../lib/sota-metrics.mjs";

function midpointCircle(op) {
  const x = (Number(op.ax) + Number(op.bx)) / 2;
  const y = (Number(op.ay) + Number(op.by)) / 2;
  const r = Number(op.r);
  return { x, y, r };
}

export function defineBlob(recipe) {
  if (!recipe || !Array.isArray(recipe.body) || recipe.body.length === 0) {
    throw new Error("recipe body is required");
  }
  const nodes = Object.create(null);
  let lastCircle = { x: 0, y: 0, r: 20 };
  for (const op of recipe.body) {
    if (op.type === "circle") {
      lastCircle = { x: op.x, y: op.y, r: op.r };
      nodes[op.id] = (px, py) => Math.hypot(px - op.x, py - op.y) - op.r;
    } else if (op.type === "capsule") {
      const c = midpointCircle(op);
      lastCircle = c;
      nodes[op.id] = (px, py) => Math.hypot(px - c.x, py - c.y) - c.r;
    } else if (op.type === "rbox") {
      lastCircle = { x: op.x, y: op.y, r: Math.min(op.w, op.h) / 2 };
      nodes[op.id] = (px, py) => Math.hypot(px - op.x, py - op.y) - lastCircle.r;
    } else if (op.type === "smin") {
      const a = nodes[op.a];
      const b = nodes[op.b];
      nodes[op.id] = (px, py) => Math.min(a(px, py), b(px, py));
    } else {
      throw new Error(`unknown body op "${op.type}"`);
    }
  }
  const root = recipe.body[recipe.body.length - 1];
  const sdf = nodes[root.id];
  return {
    recipe,
    sdf,
    silhouette() {
      return circleRing(lastCircle.x, lastCircle.y, lastCircle.r, 128);
    },
  };
}
