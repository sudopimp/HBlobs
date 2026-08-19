import { clamp } from "./sdf.js";

export const CX = 114.2705;
export const EYE_N = 48;
const DEG = Math.PI / 180;
export const FACE = { size: 1.28, gap: 2.55, height: 1, eyeWidth: 0.82, eyeHeight: 1.32 };
/** Rest eye width = former scared size. Expressions close the lids; they do not shrink the holes. */
export const EYE_REST = 1.28;
/** Held chrome idle. Recipes may override. */
export const IDLE_LEAN = { turn: -16, tilt: -7, roll: 12, scale: 1.09, eyeScale: 1.28, gazeX: 0, gazeY: 0 };
/** Vertical stadium: taller than a circle. Matches contourPath's capsule branch. */
export const STADIUM_MIN = 1.08;

export function mapPoint(x, y, turn, tilt) {
  const yaw = turn * DEG;
  const pit = tilt * DEG;
  const foreshort = 1 - Math.abs(Math.sin(yaw)) * 0.08;
  const nod = Math.sin(pit);
  const px = x * foreshort + y * Math.sin(yaw) * 0.04;
  const py = y * (1 + nod * 0.03) - Math.abs(x) * nod * 0.025;
  return [CX + px, CX + py];
}

/** Face rides on the front of the disk. */
export function mapPointSphere(x, y, turn, tilt, radius = 86) {
  const yaw = turn * DEG;
  const pit = tilt * DEG;
  const k = 0.38;
  const dx = Math.sin(yaw) * radius * k;
  const dy = Math.sin(pit) * radius * k;
  const foreshort = 1 - Math.abs(Math.sin(yaw)) * 0.1;
  return [CX + x * foreshort + dx, CX + y + dy];
}

export function isStadium(rx, ry) {
  return ry > rx * STADIUM_MIN;
}

export function ensureStadium(rx, ry) {
  if (isStadium(rx, ry)) return { rx, ry };
  return { rx, ry: rx * STADIUM_MIN + Math.max(Math.abs(rx) * 1e-6, 1e-9) };
}

/** Idle gaze stays on the pose. No wander. */
export function idleGazeTarget(pose = {}) {
  return { x: pose.gazeX ?? 0, y: pose.gazeY ?? 0 };
}

/** κ = 4/3 tan(π/8). One cubic per quarter-circle; error ~0.02% vs a true arc. */
const KAPPA = 0.5522847498307936;
/** iOS / Figma corner smoothing. 0 = hard stadium joins; 0.6 eases cap↔side (the red-circle kinks). */
export const STADIUM_SMOOTH = 0.6;

function mapped(mapFn, x, y, turn, tilt) {
  return mapFn(x, y, turn, tilt);
}

function fmt(p) {
  return `${Number(p[0]).toFixed(3)} ${Number(p[1]).toFixed(3)}`;
}

function cubicTo(mapFn, c1x, c1y, c2x, c2y, x, y, turn, tilt) {
  return `C${fmt(mapped(mapFn, c1x, c1y, turn, tilt))} ${fmt(mapped(mapFn, c2x, c2y, turn, tilt))} ${fmt(mapped(mapFn, x, y, turn, tilt))}`;
}

function lineTo(mapFn, x, y, turn, tilt) {
  return `L${fmt(mapped(mapFn, x, y, turn, tilt))}`;
}

function svgArcCenter(x1, y1, x2, y2, r, sweep) {
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const sq = dx * dx + dy * dy;
  let rad = r;
  const cr = sq / (rad * rad);
  if (cr > 1) rad *= Math.sqrt(cr);
  const num = Math.max(0, rad * rad - sq);
  const s = Math.sqrt(num / Math.max(sq, 1e-12));
  const sign = sweep === 0 ? 1 : -1;
  const cx = (x1 + x2) / 2 + sign * s * -dy;
  const cy = (y1 + y2) / 2 + sign * s * dx;
  const theta1 = Math.atan2(y1 - cy, x1 - cx);
  let dtheta = Math.atan2(y2 - cy, x2 - cx) - theta1;
  if (sweep === 0 && dtheta > 0) dtheta -= Math.PI * 2;
  if (sweep === 1 && dtheta < 0) dtheta += Math.PI * 2;
  return { cx, cy, theta1, dtheta, rad };
}

function arcToCubics(x1, y1, dx, dy, r, sweep) {
  const x2 = x1 + dx;
  const y2 = y1 + dy;
  const { cx, cy, theta1, dtheta, rad } = svgArcCenter(x1, y1, x2, y2, r, sweep);
  if (Math.abs(dtheta) < 1e-8) return [];
  const n = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2) - 1e-9));
  const seg = dtheta / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a0 = theta1 + seg * i;
    const a1 = a0 + seg;
    const k = (4 / 3) * Math.tan(seg / 4);
    const p0x = cx + Math.cos(a0) * rad;
    const p0y = cy + Math.sin(a0) * rad;
    const p1x = cx + Math.cos(a1) * rad;
    const p1y = cy + Math.sin(a1) * rad;
    out.push({
      c1x: p0x + -Math.sin(a0) * rad * k,
      c1y: p0y + Math.cos(a0) * rad * k,
      c2x: p1x - -Math.sin(a1) * rad * k,
      c2y: p1y - Math.cos(a1) * rad * k,
      x: p1x,
      y: p1y,
    });
  }
  return out;
}

/**
 * Vertical smoothed capsule in a (0,0)–(w,h) box.
 * Roomzer / Figma construction: shoulders (κ=0 on the side) + trimmed circular
 * arc + a single cap cubic so the short ends do not cusp.
 * https://roomzer.dev/corner-smoothing-on-the-web/ (accessed 2026-08-19)
 */
function verticalSmoothedCapsule(w, h, smoothing) {
  const r = w / 2;
  const s = Math.max(0, Math.min(1, smoothing));
  const beta = (45 * s * Math.PI) / 180;
  const arcHalf = (45 * (1 - s) * Math.PI) / 180;
  const arcLen = Math.sin(arcHalf) * r * Math.SQRT2;
  const c = r * Math.tan(beta / 2) * Math.cos(beta);
  const d = c * Math.tan(beta);
  const longBudget = h / 2;
  const longSpace = Math.max(0, Math.min((1 + s) * r, longBudget) - d - arcLen - c);
  const bl = longSpace / 3;
  const al = 2 * bl;
  const pLong = al + bl + c + d + arcLen;
  const t = s > 0 ? (4 * r * Math.tan(beta / 2)) / 3 : 0;
  const capSpan = w - 2 * d - 2 * arcLen;
  const tx = t * Math.sin(beta);
  const ty = t * Math.cos(beta);
  const cmds = [];
  let x = w;
  let y = h - pLong;
  cmds.push({ op: "M", x, y });
  const cubic = (c1x, c1y, c2x, c2y, ex, ey) => {
    cmds.push({ op: "C", c1x: x + c1x, c1y: y + c1y, c2x: x + c2x, c2y: y + c2y, x: x + ex, y: y + ey });
    x += ex;
    y += ey;
  };
  const arc = (dx, dy) => {
    for (const seg of arcToCubics(x, y, dx, dy, r, 1)) {
      cmds.push({ op: "C", ...seg });
    }
    x += dx;
    y += dy;
  };
  cubic(0, al, 0, al + bl, -d, al + bl + c);
  if (arcLen > 0.001) arc(-arcLen, arcLen);
  cubic(-ty, tx, -capSpan + ty, tx, -capSpan, 0);
  if (arcLen > 0.001) arc(-arcLen, -arcLen);
  cubic(-d, -c, -d, -(bl + c), -d, -(al + bl + c));
  if (h - 2 * pLong > 0.01) {
    cmds.push({ op: "L", x: 0, y: pLong });
    x = 0;
    y = pLong;
  }
  cubic(0, -al, 0, -(al + bl), d, -(al + bl + c));
  if (arcLen > 0.001) arc(arcLen, -arcLen);
  cubic(ty, -tx, capSpan - ty, -tx, capSpan, 0);
  if (arcLen > 0.001) arc(arcLen, arcLen);
  cubic(d, c, d, bl + c, d, al + bl + c);
  return cmds;
}

/** Vertical stadium with Figma/iOS cap↔side easing. Pose-warped via mapFn. */
function stadiumPath(mapFn, cx, cy, rx, ry, turn, tilt) {
  const ox = cx - rx;
  const oy = cy - ry;
  const cmds = verticalSmoothedCapsule(rx * 2, ry * 2, STADIUM_SMOOTH);
  let d = "";
  for (const cmd of cmds) {
    if (cmd.op === "M") d += `M${fmt(mapped(mapFn, ox + cmd.x, oy + cmd.y, turn, tilt))}`;
    else if (cmd.op === "L") d += lineTo(mapFn, ox + cmd.x, oy + cmd.y, turn, tilt);
    else d += cubicTo(mapFn, ox + cmd.c1x, oy + cmd.c1y, ox + cmd.c2x, oy + cmd.c2y, ox + cmd.x, oy + cmd.y, turn, tilt);
  }
  return `${d}Z`;
}

/** Ellipse (blink slit / non-stadium hole): 4 cubics, not a sampled ring. */
function ellipsePath(mapFn, cx, cy, rx, ry, turn, tilt) {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  const start = mapped(mapFn, cx + rx, cy, turn, tilt);
  return (
    `M${fmt(start)}` +
    cubicTo(mapFn, cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry, turn, tilt) +
    cubicTo(mapFn, cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy, turn, tilt) +
    cubicTo(mapFn, cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry, turn, tilt) +
    cubicTo(mapFn, cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy, turn, tilt) +
    "Z"
  );
}

export function contourPath(mapFn, cx, cy, rx, ry, turn, tilt) {
  if (isStadium(rx, ry)) return stadiumPath(mapFn, cx, cy, rx, ry, turn, tilt);
  return ellipsePath(mapFn, cx, cy, rx, ry, turn, tilt);
}

export function pathFromRing(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Eye ellipse in local space. Single source of truth for render and gates. */
export function eyeEllipse(side, openY, size, gazeX, gazeY, wink) {
  const gap = 22 * FACE.gap;
  return {
    cx: clamp(side * gap * 0.5 + gazeX * 0.16, -42, 42),
    cy: clamp(2 * FACE.height + gazeY * 0.14, -20, 16),
    rx: 10.2 * FACE.eyeWidth * FACE.size * size,
    ry: 10.2 * FACE.eyeHeight * FACE.size * size * Math.max(openY, 0.04) * wink,
  };
}

export function eyeWidthScale(eyeScale) {
  return Math.max(eyeScale, EYE_REST);
}

/** Rest hole: width from EYE_REST, openY = 1 so ry > rx * STADIUM_MIN. */
export function eyeRestEllipse(side = -1, gazeX = 0, gazeY = 0) {
  const size = eyeWidthScale(EYE_REST);
  const e = eyeEllipse(side, 1, size, gazeX, gazeY, 1);
  const { rx, ry } = ensureStadium(e.rx, e.ry);
  return { ...e, rx, ry };
}

export function eyePath(side, openY, size, gazeX, gazeY, turn, tilt, wink) {
  const { cx, cy, rx, ry } = eyeEllipse(side, openY, size, gazeX, gazeY, wink);
  return contourPath(mapPoint, cx, cy, rx, ry, turn, tilt);
}

export function eyePathAt(mapFn, side, openY, size, gazeX, gazeY, turn, tilt, wink, face = FACE, pad = 0) {
  const gap = 22 * face.gap;
  const cx = clamp(side * gap * 0.5 + gazeX * 0.16, -42, 42);
  const cy = clamp(2 * face.height + gazeY * 0.14, -20, 16);
  const extra = Math.max(0, pad);
  const rx = 10.2 * face.eyeWidth * face.size * size + extra;
  const ry = 10.2 * face.eyeHeight * face.size * size * Math.max(openY, 0.04) * wink + extra;
  return contourPath(mapFn, cx, cy, rx, ry, turn, tilt);
}

/** Plate sits behind evenodd holes so the rim is one candy edge, not two fills. */
export const EYE_PLATE = 0.8;

export function mouthPath(turn, tilt) {
  const y = 24;
  const w = 15;
  const dip = 6;
  const left = mapPoint(-w, y, turn, tilt);
  const mid = mapPoint(0, y + dip, turn, tilt);
  const right = mapPoint(w, y, turn, tilt);
  const lift = mapPoint(0, y + dip * 0.4, turn, tilt);
  return `M${left[0].toFixed(2)} ${left[1].toFixed(2)} Q${mid[0].toFixed(2)} ${mid[1].toFixed(2)} ${right[0].toFixed(2)} ${right[1].toFixed(2)} Q${lift[0].toFixed(2)} ${lift[1].toFixed(2)} ${left[0].toFixed(2)} ${left[1].toFixed(2)}Z`;
}
