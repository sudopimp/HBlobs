/**
 * Visual maker — Node-importable recipe authoring.
 * Templates are hardcoded objects. Query parsing lives in loadQuery.
 */
import { smin, traceSdf } from "../src/engine/sdf.js";
import { STATE_GROUPS } from "../src/engine/poses.js";

const RING_N = 128;
const MAGENTA = "#e84a9a";
const TEAL = "#2ec4b6";

const FACE_GUMMY = { size: 1.0, gap: 2.20, height: 0.55, eyeWidth: 0.82, eyeHeight: 1.32 };
const FACE_DROPLET = { size: 0.95, gap: 2.0, height: 0.4, eyeWidth: 0.82, eyeHeight: 1.32 };

export const LAB_STATES = [
  "idle",
  "listening",
  "thinking",
  "working",
  "run",
  "failed",
  ...STATE_GROUPS.lifecycle.filter((s) => !["idle"].includes(s)),
].filter((s, i, a) => a.indexOf(s) === i);

const CORE_STATES = Object.fromEntries(LAB_STATES.map((s) => [s, {}]));

const DROPLET = {
  schemaVersion: 0,
  tag: "droplet-blob",
  template: "droplet",
  skin: "flat",
  state: "idle",
  fill: TEAL,
  face: { ...FACE_DROPLET },
  states: { ...CORE_STATES },
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
  fill: MAGENTA,
  face: { ...FACE_GUMMY },
  states: { ...CORE_STATES },
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
let massSeq = 0;

function hydrate(recipe) {
  if (!recipe.states || typeof recipe.states !== "object" || Array.isArray(recipe.states)) {
    recipe.states = {};
  }
  for (const key of ["idle", "run", "failed"]) {
    if (!recipe.states[key] || typeof recipe.states[key] !== "object") recipe.states[key] = {};
  }
  if (!recipe.face || typeof recipe.face !== "object") {
    recipe.face = { ...(recipe.template === "droplet" ? FACE_DROPLET : FACE_GUMMY) };
  }
  if (!recipe.fill) recipe.fill = recipe.template === "droplet" ? TEAL : MAGENTA;
  if (!recipe.state) recipe.state = "idle";
  if (recipe.skin !== "gummy") recipe.skin = "flat";
  return recipe;
}

export function applyTemplate(name) {
  current = hydrate(structuredClone(name === "gummy" ? GUMMY : DROPLET));
  massSeq = 0;
  return current;
}

export function serializeRecipe() {
  return hydrate(current);
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

function massRadius(x, y) {
  let r = 36;
  for (const n of current.body) {
    if (n.type !== "circle") continue;
    const d = Math.hypot(x - n.x, y - n.y);
    const bulge = n.r - d + 24;
    if (bulge > r) r = bulge;
  }
  return r;
}

export function addMass(x, y) {
  if (!current?.body) return current;
  const px = Number(x);
  const py = Number(y);
  const cx = Number.isFinite(px) ? px : 0;
  const cy = Number.isFinite(py) ? py : 0;
  const r = massRadius(cx, cy);
  massSeq += 1;
  const id = `click-${massSeq}`;
  const joinId = `join-${massSeq}`;
  const root = rootNode(current.body);
  current.body.push({ type: "circle", id, x: cx, y: cy, r });
  current.body.push({ type: "smin", id: joinId, a: root.id, b: id, k: 18 });
  return current;
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
    current = hydrate(parsed);
    return true;
  } catch {
    return false;
  }
}

export function shareSearch(recipe = current) {
  return `?recipe=${encodeURIComponent(JSON.stringify(recipe))}`;
}

export async function exportPack(outDir) {
  const href = new URL("../src/pack/write.js", import.meta.url);
  let mod;
  try {
    mod = await import(href.href);
  } catch {
    throw new Error("exportPack: src/pack/write.js is missing — pack writer is not available yet");
  }
  const write = mod.writePack ?? mod.exportPack ?? mod.default;
  if (typeof write !== "function") {
    throw new Error("exportPack: src/pack/write.js exports no write function");
  }
  return write(outDir, serializeRecipe());
}
