/** Locked-look transforms. Unknown tokens throw; the prompt is never eval'd. */

const UNKNOWN = "FAIL unknown-look";

const COLORS = {
  red: "#e84a4a",
  pink: "#e84a9a",
  teal: "#5ad4c8",
  mint: "#5ad4c8",
  purple: "#7c5cff",
  green: "#3dd68c",
  yellow: "#f5c542",
  orange: "#f59b42",
  blue: "#4a8ae8",
  black: "#1a1a1c",
  white: "#f4f1ea",
};

function cloneRecipe(recipe) {
  return JSON.parse(JSON.stringify(recipe ?? {}));
}

function eachCircle(recipe, fn) {
  const body = Array.isArray(recipe.body) ? recipe.body : [];
  for (const op of body) {
    if (op && op.type === "circle") fn(op);
  }
}

function eachSmin(recipe, fn) {
  const body = Array.isArray(recipe.body) ? recipe.body : [];
  for (const op of body) {
    if (op && op.type === "smin") fn(op);
  }
}

function scaleRadii(recipe, factor) {
  eachCircle(recipe, (op) => {
    if (Number.isFinite(op.r)) op.r *= factor;
  });
  const params = recipe.params;
  if (params && typeof params === "object") {
    for (const key of Object.keys(params)) {
      if (Number.isFinite(params[key])) params[key] *= factor;
    }
  }
}

function addRadii(recipe, delta) {
  eachCircle(recipe, (op) => {
    if (Number.isFinite(op.r)) op.r += delta;
  });
}

function lookFatter(recipe) {
  scaleRadii(recipe, 1.12);
  return recipe;
}

function lookThinner(recipe) {
  scaleRadii(recipe, 0.88);
  return recipe;
}

function lookTaller(recipe) {
  let moved = false;
  eachCircle(recipe, (op) => {
    if (Number.isFinite(op.y) && op.y !== 0) {
      op.y *= 1.22;
      moved = true;
    }
  });
  if (!moved) {
    eachCircle(recipe, (op) => {
      if (Number.isFinite(op.y)) op.y -= 6;
    });
  }
  return recipe;
}

function lookRounder(recipe) {
  eachCircle(recipe, (op) => {
    if (Number.isFinite(op.y)) op.y *= 0.55;
  });
  eachSmin(recipe, (op) => {
    if (Number.isFinite(op.k)) op.k = Math.max(op.k, 28);
  });
  return recipe;
}

function lookMelt(recipe) {
  addRadii(recipe, 6);
  eachCircle(recipe, (op) => {
    if (Number.isFinite(op.y)) op.y *= 0.7;
    if (Number.isFinite(op.x)) op.x *= 1.15;
  });
  eachSmin(recipe, (op) => {
    if (Number.isFinite(op.k)) op.k += 8;
  });
  return recipe;
}

function lookDrop(recipe) {
  const body = Array.isArray(recipe.body) ? recipe.body : [];
  const circles = body.filter((op) => op && op.type === "circle");
  if (circles.length === 1) {
    const mass = circles[0];
    const r = Number.isFinite(mass.r) ? mass.r : 40;
    mass.id = "head";
    mass.x = 0;
    mass.y = 0;
    mass.r = r;
    body.push({ type: "circle", id: "belly", x: 0, y: Math.round(r * 0.5), r: Math.round(r * 0.92) });
    body.push({ type: "smin", id: "mass", a: "head", b: "belly", k: 28 });
    recipe.body = body;
    return recipe;
  }
  eachCircle(recipe, (op) => {
    if (op.id === "belly" && Number.isFinite(op.y)) op.y = Math.max(op.y, 20);
    if (op.id === "head" && Number.isFinite(op.y)) op.y = Math.min(op.y, 0);
  });
  return recipe;
}

const LOOKS = {
  fatter: lookFatter,
  thinner: lookThinner,
  taller: lookTaller,
  rounder: lookRounder,
  melt: lookMelt,
  drop: lookDrop,
};

function throwUnknown(token) {
  throw new Error(`${UNKNOWN} ${String(token)}`);
}

export function applyLook(recipe, token, _opts) {
  void _opts;
  const key = String(token ?? "")
    .trim()
    .toLowerCase();
  if (Object.hasOwn(LOOKS, key)) {
    return LOOKS[key](cloneRecipe(recipe));
  }
  if (Object.hasOwn(COLORS, key)) {
    const next = cloneRecipe(recipe);
    next.fill = COLORS[key];
    return next;
  }
  throwUnknown(token);
}

export default applyLook;
