/**
 * One paused engine frame as SVG — same paths and face transform as BlobElement._tick.
 * Pack/demo rasters call this. They do not invent a second painter.
 */
import { defineBlob } from "../engine/define-blob.js";
import {
  CX,
  IDLE_LEAN,
  eyePathAt,
  eyeWidthScale,
  mapPoint,
  mouthPath,
  pathFromRing,
} from "../engine/face.js";
import { blinkOpenY } from "../engine/blink.js";
import { CODEX_ROWS, FRAME_COUNTS, HOLE } from "./const.js";
import { posesFor } from "./geometry.js";

const DEG = Math.PI / 180;

function poseOf(api, state) {
  let raw = {};
  try {
    raw = api.targetsFor(state);
  } catch {
    raw = api.targetsFor(api.STATES.includes("idle") ? "idle" : api.STATES[0]);
  }
  return { ...IDLE_LEAN, scale: 1.09, earL: 1, earR: 1, ...raw };
}

function mapFnFor(pose) {
  const turn = pose.turn ?? 0;
  const tilt = pose.tilt ?? 0;
  const a = (pose.roll ?? 0) * DEG;
  const ox = Number.isFinite(pose.faceOx) ? pose.faceOx : 0;
  const oy = Number.isFinite(pose.faceOy) ? pose.faceOy : 0;
  return (x, y) => {
    const xr = x * Math.cos(a) - y * Math.sin(a) + ox;
    const yr = x * Math.sin(a) + y * Math.cos(a) + oy;
    return mapPoint(xr, yr, turn, tilt);
  };
}

function faceTransform(pose, motion = {}) {
  const tilt = pose.tilt ?? 0;
  const turn = pose.turn ?? 0;
  const roll = pose.roll ?? 0;
  const scale = pose.scale ?? 1;
  const breathe = motion.sy ?? 1;
  const sy = scale * breathe * (1 - tilt * 0.002) * (motion.scaleY ?? 1);
  const sx = (scale / Math.max(breathe, 0.72)) * (motion.sx ?? 1);
  const rot = turn * 0.55 + roll * 0.45;
  const x = (motion.ox ?? 0) + (motion.x ?? 0);
  const y = (motion.oy ?? 0) + (motion.y ?? 0);
  const shear = motion.shear ?? 0;
  const skew = Math.atan(shear) * (180 / Math.PI);
  return `translate(${CX + x} ${CX + y}) rotate(${rot}) skewX(${skew.toFixed(3)}) scale(${sx} ${sy}) translate(${-CX} ${-CX})`;
}

export function renderEngineSvg(recipe, { state = "idle", motion = {} } = {}) {
  const api = defineBlob(recipe);
  const pose = poseOf(api, state);
  const fill = recipe.fill ?? "#ff5ec8";
  const hole = HOLE;
  const chrome = recipe.finish !== "flat" && recipe.skin !== "flat";
  const mapFn = mapFnFor({ ...pose, faceOx: recipe.face?.ox, faceOy: recipe.face?.oy });
  const silOpts = {};
  if (pose.earL != null) silOpts.earL = pose.earL;
  if (pose.earR != null) silOpts.earR = pose.earR;
  const ring = api.silhouette(silOpts);
  const bodyD = pathFromRing(ring.map(([x, y]) => mapPoint(x, y, pose.turn ?? 0, pose.tilt ?? 0)));
  const size = eyeWidthScale(pose.eyeScale ?? 1.28);
  const openY = blinkOpenY(1, pose.eyeScale);
  const face = { size: 1.28, gap: 2.55, height: 1, eyeWidth: 0.82, eyeHeight: 1.32, ...(recipe.face ?? {}) };
  const eyeL = eyePathAt(mapFn, -1, openY, size, pose.gazeX ?? 0, pose.gazeY ?? 0, pose.turn ?? 0, pose.tilt ?? 0, 1, face);
  const eyeR = eyePathAt(mapFn, 1, openY, size, pose.gazeX ?? 0, pose.gazeY ?? 0, pose.turn ?? 0, pose.tilt ?? 0, 1, face);
  const clipId = "hblob-clip";
  const coreId = "hblob-core";
  const gloss = (cx, cy, rx, ry, op) => {
    const [px, py] = mapPoint(cx, cy, pose.turn ?? 0, pose.tilt ?? 0);
    return `<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${chrome ? op : 0}"/>`;
  };
  const [corex, corey] = mapPoint(0, 10, pose.turn ?? 0, pose.tilt ?? 0);
  const mouth = chrome ? mouthPath(pose.turn ?? 0, pose.tilt ?? 0) : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 259 259" width="384" height="384">
  <defs>
    <clipPath id="${clipId}"><path d="${bodyD}"/></clipPath>
    <radialGradient id="${coreId}" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".32"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="${faceTransform(pose, motion)}">
    <path d="${bodyD}" fill="${fill}"/>
    <g clip-path="url(#${clipId})">
      <ellipse cx="${corex.toFixed(2)}" cy="${corey.toFixed(2)}" rx="56" ry="62" fill="url(#${coreId})" opacity="${chrome ? 1 : 0}"/>
      ${gloss(-14, -16, 24, 13, 0.55)}
      ${gloss(-50, -60, 7, 6, 0.5)}
      ${gloss(50, -60, 7, 6, 0.5)}
      <path d="${eyeL}" fill="${hole}"/>
      <path d="${eyeR}" fill="${hole}"/>
      ${mouth ? `<path d="${mouth}" fill="${hole}" opacity="1"/>` : ""}
    </g>
  </g>
</svg>`;
}

export function buildEngineFrames(recipe) {
  const api = defineBlob(recipe);
  const frames = [];
  let right = [];
  for (let row = 0; row < CODEX_ROWS.length; row++) {
    const name = CODEX_ROWS[row];
    const count = FRAME_COUNTS[name];
    const motions = posesFor(name, count);
    const state = api.STATES.includes(name)
      ? name
      : name === "running" && api.STATES.includes("run")
        ? "run"
        : api.STATES.includes("idle")
          ? "idle"
          : api.STATES[0];
    if (name === "running-left") {
      for (let col = 0; col < count; col++) {
        frames.push({ col, row, svg: right[col].svg, flip: true });
      }
      continue;
    }
    for (let col = 0; col < count; col++) {
      const cell = { col, row, svg: renderEngineSvg(recipe, { state, motion: motions[col] }), flip: false };
      frames.push(cell);
      if (name === "running-right") right[col] = cell;
    }
  }
  return frames;
}
