import { clamp } from "./sdf.js";

export const CX = 114.2705;
export const EYE_N = 48;
const DEG = Math.PI / 180;
export const FACE = { size: 1.28, gap: 2.55, height: 1, eyeWidth: 0.82, eyeHeight: 1.32 };
/** Rest eye width = former scared size. Expressions close the lids; they do not shrink the holes. */
export const EYE_REST = 1.28;

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

export function contourPath(mapFn, cx, cy, rx, ry, turn, tilt) {
  const pts = [];
  if (ry > rx * 1.08) {
    const h = ry - rx;
    const n = EYE_N;
    const half = n / 2;
    for (let i = 0; i < n; i++) {
      if (i < half) {
        const a = Math.PI + (i / half) * Math.PI;
        pts.push(mapFn(cx + Math.cos(a) * rx, cy - h + Math.sin(a) * rx, turn, tilt));
      } else {
        const a = ((i - half) / half) * Math.PI;
        pts.push(mapFn(cx + Math.cos(a) * rx, cy + h + Math.sin(a) * rx, turn, tilt));
      }
    }
  } else {
    for (let i = 0; i < EYE_N; i++) {
      const a = (i / EYE_N) * Math.PI * 2;
      pts.push(mapFn(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, turn, tilt));
    }
  }
  return pathFromRing(pts);
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

export function eyePath(side, openY, size, gazeX, gazeY, turn, tilt, wink) {
  const { cx, cy, rx, ry } = eyeEllipse(side, openY, size, gazeX, gazeY, wink);
  return contourPath(mapPoint, cx, cy, rx, ry, turn, tilt);
}

export function eyePathAt(mapFn, side, openY, size, gazeX, gazeY, turn, tilt, wink, face = FACE) {
  const gap = 22 * face.gap;
  const cx = clamp(side * gap * 0.5 + gazeX * 0.16, -42, 42);
  const cy = clamp(2 * face.height + gazeY * 0.14, -20, 16);
  const rx = 10.2 * face.eyeWidth * face.size * size;
  const ry = 10.2 * face.eyeHeight * face.size * size * Math.max(openY, 0.04) * wink;
  return contourPath(mapFn, cx, cy, rx, ry, turn, tilt);
}

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
