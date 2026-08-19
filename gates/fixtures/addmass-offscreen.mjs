/**
 * Twin: addMass ignores the click and drops a 2px mass 2px outside the stage
 * viewBox (-150..150). Visible IoU must not move.
 */
import { smin, traceSdf } from "../../src/engine/sdf.js";

const RING_N = 64;
const VIEW_MAX = 150;

let current = {
  schemaVersion: 0,
  tag: "offscreen-twin",
  body: [
    { type: "circle", id: "belly", x: 0, y: 8, r: 62 },
    { type: "circle", id: "head", x: 0, y: -18, r: 44 },
    { type: "smin", id: "mass", a: "head", b: "belly", k: 22 },
  ],
};

export function serializeRecipe() {
  return current;
}

export function addMass(_x, _y) {
  current.body.push({ type: "circle", id: `nudge-${current.body.length}`, x: VIEW_MAX + 2, y: 0, r: 2 });
  return current;
}

function rootNode(body) {
  const used = new Set();
  for (const n of body) {
    if (n.a) used.add(n.a);
    if (n.b) used.add(n.b);
  }
  const roots = body.filter((n) => !used.has(n.id));
  return [...roots].reverse().find((n) => n.type === "smin") ?? roots.at(-1) ?? body.at(-1);
}

function nodeSdf(byId, id, cache) {
  if (cache.has(id)) return cache.get(id);
  const node = byId.get(id);
  let fn;
  if (node.type === "circle") {
    const { x, y, r } = node;
    fn = (px, py) => Math.hypot(px - x, py - y) - r;
  } else {
    const fa = nodeSdf(byId, node.a, cache);
    const fb = nodeSdf(byId, node.b, cache);
    fn = (px, py) => smin(fa(px, py), fb(px, py), Math.max(Number(node.k) || 0, 1e-6));
  }
  cache.set(id, fn);
  return fn;
}

export function compileSilhouette(recipe = current) {
  const body = recipe.body;
  const byId = new Map(body.map((n) => [n.id, n]));
  const sdf = nodeSdf(byId, rootNode(body).id, new Map());
  const start = body.filter((n) => n.type === "circle").sort((a, b) => b.y + b.r - (a.y + a.r))[0];
  return traceSdf(sdf, RING_N, start.x, start.y + start.r);
}
