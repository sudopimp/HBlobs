import { defineBlob } from "../engine/define-blob.js";
import { CX, mapPoint } from "../engine/face.js";
import { spring, stepSpring } from "../engine/spring.js";
import { CELL_H, CELL_W, CODEX_ROWS, FRAME_COUNTS } from "./const.js";

const SCALE = 0.92;
const ORIGIN_X = 96;
const ORIGIN_Y = 110;

function cellPoint(x, y, pose) {
  const sx = pose.sx ?? 1;
  const sy = pose.sy ?? 1;
  const shear = pose.shear ?? 0;
  let px = x * sx;
  let py = y * sy;
  px += py * shear;
  return [ORIGIN_X + px * SCALE + (pose.ox ?? 0), ORIGIN_Y + py * SCALE + (pose.oy ?? 0)];
}

function applyMap(ring, turn, tilt) {
  if (!turn && !tilt) return ring;
  return ring.map(([x, y]) => {
    const [px, py] = mapPoint(x, y, turn, tilt);
    return [px - CX, py - CX];
  });
}

function projectEye(eye, pose, turn, tilt) {
  let x = eye.cx;
  let y = eye.cy;
  if (turn || tilt) {
    const [px, py] = mapPoint(x, y, turn, tilt);
    x = px - CX;
    y = py - CX;
  }
  const [cx, cy] = cellPoint(x, y, pose);
  const sx = (pose.sx ?? 1) * SCALE;
  const sy = (pose.sy ?? 1) * SCALE;
  return { cx, cy, rx: Math.max(3, eye.rx * sx), ry: Math.max(4, eye.ry * sy) };
}

function flipX(cell) {
  return {
    col: cell.col,
    row: cell.row,
    ring: cell.ring.map(([x, y]) => [CELL_W - x, y]),
    eyes: cell.eyes.map((e) => ({ ...e, cx: CELL_W - e.cx })),
  };
}

function sampleWalk(n, { ampX, ampY, squat, lean, sx }) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    frames.push({
      sx,
      // sin so frames 0 and n/2 share squash; travel comes from ox + lean.
      sy: squat + 0.04 * Math.sin(a),
      shear: lean * Math.cos(a),
      ox: ampX * Math.cos(a),
      oy: ampY * Math.sin(a),
    });
  }
  return frames;
}

function stepIdle(n) {
  const s = { sy: spring(1), oy: spring(2) };
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s.sy.t = 1 + 0.028 * Math.sin(a);
    s.oy.t = 2 + 2.2 * Math.sin(a);
    for (let k = 0; k < 10; k++) {
      stepSpring(s.sy, 1 / 60, 9, 0.85);
      stepSpring(s.oy, 1 / 60, 6, 0.9);
    }
    out.push({ sx: 1, sy: s.sy.x, shear: -0.06, ox: 0, oy: s.oy.x });
  }
  return out;
}

export function posesFor(rowName, count) {
  switch (rowName) {
    case "idle":
      return stepIdle(count);
    case "running":
      // Frame 0 vs 3 is a half cycle: opposite lean + centroid travel.
      return sampleWalk(count, { ampX: 8, ampY: 2, squat: 0.82, lean: 0.16, sx: 1.16 });
    case "running-right":
      return sampleWalk(count, { ampX: 11, ampY: 4, squat: 0.84, lean: 0.22, sx: 1.14 });
    case "running-left":
      return sampleWalk(count, { ampX: 11, ampY: 4, squat: 0.84, lean: 0.22, sx: 1.14 });
    case "waving":
      return Array.from({ length: count }, (_, i) => ({
        sx: 1.04,
        sy: 1.02 + 0.03 * Math.sin((i / count) * Math.PI),
        shear: -0.04 + 0.08 * (i / Math.max(1, count - 1)),
        ox: 2 * i,
        oy: -3 * Math.sin((i / count) * Math.PI),
      }));
    case "jumping":
      return Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1);
        const up = Math.sin(t * Math.PI);
        return { sx: 1.06 - 0.1 * up, sy: 0.92 + 0.18 * up, shear: -0.04, ox: 0, oy: -22 * up };
      });
    case "failed":
      return Array.from({ length: count }, (_, i) => ({
        sx: 1.12 + 0.04 * Math.sin((i / count) * Math.PI * 2),
        sy: 0.86,
        shear: 0.06 * Math.sin((i / count) * Math.PI * 2),
        ox: 3 * Math.sin((i / count) * Math.PI * 2),
        oy: 10,
      }));
    case "waiting":
      return Array.from({ length: count }, (_, i) => ({
        sx: 1.02,
        sy: 1.0 + 0.04 * Math.sin((i / count) * Math.PI * 2),
        shear: -0.03,
        ox: 2 * Math.sin((i / count) * Math.PI * 2),
        oy: 4,
      }));
    case "review":
      return Array.from({ length: count }, (_, i) => ({
        sx: 1.04,
        sy: 1.0,
        shear: -0.1 + 0.16 * (i / Math.max(1, count - 1)),
        ox: -4 + i,
        oy: 1,
      }));
    default:
      return Array.from({ length: count }, () => ({ sx: 1, sy: 1, shear: 0, ox: 0, oy: 0 }));
  }
}

function geomFor(blob, state, pose) {
  const geo = blob.faceGeometry(state);
  const turn = state === "idle" ? -16 : 0;
  const tilt = state === "idle" ? -7 : 0;
  const ringLocal = applyMap(geo.ring, turn, tilt);
  return {
    ring: ringLocal.map(([x, y]) => cellPoint(x, y, pose)),
    eyes: geo.eyes.map((e) => projectEye(e, pose, turn, tilt)),
  };
}

export function buildCells(recipe) {
  const blob = defineBlob(recipe);
  const cells = [];
  const rightFrames = [];

  for (let row = 0; row < CODEX_ROWS.length; row++) {
    const name = CODEX_ROWS[row];
    const count = FRAME_COUNTS[name];
    const poses = posesFor(name, count);
    const state = blob.STATES.includes(name) ? name : blob.STATES.includes("idle") ? "idle" : blob.STATES[0];

    if (name === "running-left") {
      for (let col = 0; col < count; col++) {
        const src = rightFrames[col];
        if (!src) throw new Error("running-left needs running-right first");
        cells.push(flipX({ ...src, col, row }));
      }
      continue;
    }

    for (let col = 0; col < count; col++) {
      const { ring, eyes } = geomFor(blob, state, poses[col]);
      const cell = { col, row, ring, eyes };
      cells.push(cell);
      if (name === "running-right") rightFrames[col] = cell;
    }
  }

  return cells;
}
