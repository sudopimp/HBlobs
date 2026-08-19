/**
 * Twin: the old 48-point sampled stadium. Caps become chords when zoomed.
 * Must be rejected by G-eye-smooth as sampled-ring.
 */
import { clamp } from "../../src/engine/sdf.js";
import { EYE_N, FACE, isStadium, mapPoint, pathFromRing } from "../../src/engine/face.js";

export function contourPath(mapFn, cx, cy, rx, ry, turn, tilt) {
  const pts = [];
  if (isStadium(rx, ry)) {
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

export function eyePath(side, openY, size, gazeX, gazeY, turn, tilt, wink) {
  const gap = 22 * FACE.gap;
  const cx = clamp(side * gap * 0.5 + gazeX * 0.16, -42, 42);
  const cy = clamp(2 * FACE.height + gazeY * 0.14, -20, 16);
  const rx = 10.2 * FACE.eyeWidth * FACE.size * size;
  const ry = 10.2 * FACE.eyeHeight * FACE.size * size * Math.max(openY, 0.04) * wink;
  return contourPath(mapPoint, cx, cy, rx, ry, turn, tilt);
}
