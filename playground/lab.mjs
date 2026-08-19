/**
 * Visual maker — Node-importable recipe authoring.
 * Templates are hardcoded objects. Query parsing lives in loadQuery.
 */
import { smin, traceSdf } from "../src/engine/sdf.js";

const RING_N = 128;

const DROPLET = {
  schemaVersion: 0,
  tag: "droplet-blob",
  template: "droplet",
  skin: "flat",
  state: "idle",
  body: [
    { type: "circle", id: "head", x: 0, y: -20, r: 48 },
    { type: "circle", id: "belly", x: 0, y: 28, r: 70 },
    { type: "smin", id: "mass", a: "head", b: "belly", k: 28 },
  ],
};

const GUMMY = {
  schemaVersion: 0,
  tag: "gummy-blob",
  template: "gummy",
  skin: "flat",
  state: "idle",
  body: [
    { type: "circle", id: "head", x: 0, y: 4, r: 64 },
    { type: "circle", id: "belly", x: 0, y: 22, r: 62 },
    { type: "circle", id: "earL", x: -50, y: -58, r: 18 },
    { type: "circle", id: "earR", x: 50, y: -58, r: 18 },
    { type: "smin", id: "mass", a: "head", b: "belly", k: 32 },
    { type: "smin", id: "ears", a: "earL", b: "earR", k: 5 },
    { type: "smin", id: "body", a: "mass", b: "ears", k: 5 },
  ],
};

let current = structuredClone(GUMMY);
let lastYMid = 0;

export function applyTemplate(name) {
  current = structuredClone(name === "gummy" ? GUMMY : DROPLET);
  return current;
}

export function serializeRecipe() {
  return current;
}

export function setSlider(name, value) {
  if (!current?.body) return;
  const v = Number(value);
  if (!Number.isFinite(v)) return;
  if (name === "belly") {
    const node = current.body.find(
      (n) => n.type === "circle" && (n.id === "belly" || n.id === "base"),
    );
    if (node) node.r = Math.max(8, v);
    return;
  }
  if (name === "earL" || name === "earR") {
    const node = current.body.find((n) => n.type === "circle" && n.id === name);
    if (node) node.r = Math.max(0, v * 0.36);
  }
}

function rootNode(body) {
  const used = new Set();
  for (const n of body) {
    if (n.a) used.add(n.a);
    if (n.b) used.add(n.b);
  }
  const roots = body.filter((n) => !used.has(n.id));
  const sminRoot = [...roots].reverse().find((n) => n.type === "smin");
  return sminRoot ?? roots[roots.length - 1] ?? body[body.length - 1];
}

function nodeSdf(byId, id, cache) {
  if (cache.has(id)) return cache.get(id);
  const node = byId.get(id);
  if (!node) throw new Error(`missing body node ${id}`);
  let fn;
  if (node.type === "circle") {
    const { x, y, r } = node;
    fn = (px, py) => Math.hypot(px - x, py - y) - r;
  } else if (node.type === "smin") {
    const fa = nodeSdf(byId, node.a, cache);
    const fb = nodeSdf(byId, node.b, cache);
    const k = Math.max(Number(node.k) || 0, 1e-6);
    fn = (px, py) => smin(fa(px, py), fb(px, py), k);
  } else {
    throw new Error(`unknown body node ${node.type}`);
  }
  cache.set(id, fn);
  return fn;
}

export function compileSilhouette(recipe) {
  const body = recipe?.body;
  if (!Array.isArray(body) || body.length === 0) {
    lastYMid = 0;
    return [];
  }
  const byId = new Map(body.map((n) => [n.id, n]));
  const sdf = nodeSdf(byId, rootNode(body).id, new Map());
  let start = null;
  for (const n of body) {
    if (n.type !== "circle") continue;
    if (!start || n.y + n.r > start.y + start.r) start = n;
  }
  const startX = start ? start.x : 0;
  const startY = start ? start.y + start.r : 80;
  const pts = traceSdf(sdf, RING_N, startX, startY);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const mid = (minY + maxY) / 2;
  lastYMid = mid;
  return pts.map(([x, y]) => [x, y - mid]);
}

export function ringYMid() {
  return lastYMid;
}

export function loadQuery(search) {
  const rawSearch =
    search ?? (typeof location !== "undefined" ? location.search : "");
  const q = new URLSearchParams(rawSearch);
  const raw = q.get("recipe");
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.body)) {
      return false;
    }
    current = parsed;
    return true;
  } catch {
    return false;
  }
}

export function shareSearch(recipe = current) {
  return `?recipe=${encodeURIComponent(JSON.stringify(recipe))}`;
}
