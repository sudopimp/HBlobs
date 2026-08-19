import { smin, traceSdf, mirrorRing } from "../engine/sdf.js";
import { eyeEllipse, eyeWidthScale } from "../engine/face.js";
import {
  STATE_GROUPS,
  PRODUCT_STATES,
  PRODUCT_POSES,
  MOUTHLESS,
  BLINK_ON,
  WINK_ON,
  blinksOn,
} from "../engine/poses.js";

export const CUSTOM_ELEMENT = "gummy-blob";
export {
  STATE_GROUPS,
  MOUTHLESS,
  BLINK_ON,
  WINK_ON,
  blinksOn,
};
export const GUMMY_STATES = PRODUCT_STATES;
export const POSES = PRODUCT_POSES;
export const RING_N = 128;
export const BLINK_MIN = 6000;
export const BLINK_SPAN = 8000;

export function targetsFor(state) {
  const pose = POSES[state];
  if (!pose) throw new Error(`unknown gummy state: ${state}`);
  return { ...pose };
}

export function sampleGummy(earL, earR) {
  const hx = 0;
  const hy = 4;
  const hr = 64;
  const bx = 0;
  const by = 22;
  const br = 62;
  const kMass = 32;
  const ex = 50;
  const ey = -58;
  const er = 18;
  const kEar = 5;
  const rL = er * earL;
  const rR = er * earR;
  const sdf = (px, py) => {
    const dH = Math.hypot(px - hx, py - hy) - hr;
    const dB = Math.hypot(px - bx, py - by) - br;
    const body = smin(dH, dB, kMass);
    const dL = Math.hypot(px + ex, py - ey) - rL;
    const dR = Math.hypot(px - ex, py - ey) - rR;
    return smin(body, smin(dL, dR, kEar), kEar);
  };
  let pts = traceSdf(sdf, RING_N, bx, by + br);
  if (Math.abs(earL - earR) < 0.04) pts = mirrorRing(pts);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const mid = (minY + maxY) / 2;
  return pts.map(([x, y]) => [x, y - mid]);
}

export function silhouette({ earL = 1, earR = 1 } = {}) {
  return sampleGummy(earL, earR);
}

export function faceGeometry(state, { gaze = 0 } = {}) {
  const pose = targetsFor(state);
  const size = eyeWidthScale(pose.eyeScale);
  const gazeX = pose.gazeX * gaze;
  const gazeY = pose.gazeY * gaze;
  return {
    ring: sampleGummy(pose.earL, pose.earR),
    eyes: [
      eyeEllipse(-1, pose.eyeScale, size, gazeX, gazeY, 1),
      eyeEllipse(1, pose.eyeScale, size, gazeX, gazeY, 1),
    ],
  };
}
