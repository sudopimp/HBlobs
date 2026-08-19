/** Deterministic seed → recipe. Same seed always yields identical JSON bytes. */

function hash32(seed) {
  let h = 2166136261 >>> 0;
  const text = String(seed ?? "");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function rng32(seedHash) {
  let h = seedHash >>> 0;
  return function next() {
    h = (h + 0x9e3779b9) >>> 0;
    let z = h;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

const FILLS = ["#5ad4c8", "#e84a9a", "#7c5cff", "#3dd68c", "#f5c542"];

export function recipeFromSeed(seed) {
  const next = rng32(hash32(seed));
  const pick = (lo, hi) => lo + (next() % (hi - lo + 1));
  const headR = pick(48, 72);
  const bellyR = pick(44, 68);
  const headY = pick(-4, 8);
  const bellyY = pick(16, 36);
  const k = pick(18, 36);
  const fill = FILLS[next() % FILLS.length];
  return {
    schemaVersion: 0,
    tag: "seed-blob",
    fill,
    body: [
      { type: "circle", id: "head", x: 0, y: headY, r: headR },
      { type: "circle", id: "belly", x: 0, y: bellyY, r: bellyR },
      { type: "smin", id: "mass", a: "head", b: "belly", k },
    ],
    states: { idle: {} },
  };
}

export default recipeFromSeed;
