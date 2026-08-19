import { smin, traceSdf, mirrorRing } from "../engine/sdf.js";
import { eyeEllipse, eyeWidthScale } from "../engine/face.js";

export const CUSTOM_ELEMENT = "gummy-blob";

export const STATE_GROUPS = {
  lifecycle: ["sleeping", "waking", "idle", "listening", "thinking", "searching", "working"],
  reactions: [
    "excited",
    "surprised",
    "suspicious",
    "angry",
    "drowsy",
    "happy",
    "curious",
    "confused",
    "bored",
    "proud",
    "shy",
    "sad",
    "laughing",
    "scared",
    "playful",
    "celebrate",
  ],
  morphs: ["orbit", "radar", "progress"],
  product: [
    "spawning",
    "humming",
    "loading",
    "dictating",
    "writing",
    "sending",
    "receiving",
    "uploading",
    "notifying",
    "alerting",
    "dragging",
    "bouncing",
    "powering-down",
  ],
};

export const GUMMY_STATES = Object.values(STATE_GROUPS).flat();

export const RING_N = 128;
export const BLINK_MIN = 6000;
export const BLINK_SPAN = 8000;
export const MOUTHLESS = new Set(["sleeping", "powering-down", "orbit", "radar", "progress"]);

export const BLINK_ON = new Set([
  "idle",
  "listening",
  "thinking",
  "searching",
  "working",
  "excited",
  "surprised",
  "suspicious",
  "angry",
  "happy",
  "curious",
  "confused",
  "bored",
  "proud",
  "shy",
  "sad",
  "laughing",
  "scared",
  "playful",
  "celebrate",
  "humming",
  "notifying",
  "dragging",
]);

export const WINK_ON = new Set(["idle", "happy", "excited", "curious", "playful"]);

export function blinksOn(state) {
  return BLINK_ON.has(state);
}

export const POSES = {
  sleeping: { turn: 2, tilt: 12, roll: 4, scale: 0.96, eyeScale: 0.08, gazeX: 0, gazeY: 2, gazeMin: 4000, gazeMax: 7000, bounce: 0.004, earL: 1.04, earR: 1.06, overlay: "none", spin: 0, shake: 0, squash: 0.004, zoom: 1 },
  waking: { turn: -8, tilt: 2, roll: 8, scale: 1.04, eyeScale: 0.72, gazeX: 4, gazeY: -2, gazeMin: 1800, gazeMax: 3200, bounce: 0.01, earL: 1.12, earR: 1.08, overlay: "none", spin: 0, shake: 0, squash: 0.01, zoom: 1 },
  idle: { turn: -16, tilt: -7, roll: 12, scale: 1.09, eyeScale: 1.28, gazeX: 0, gazeY: 0, gazeMin: 2500, gazeMax: 5500, bounce: 0.01, earL: 1.2, earR: 1.18, overlay: "none", spin: 0, shake: 0, squash: 0.01, zoom: 1 },
  listening: { turn: 14, tilt: -6, roll: 16, scale: 1.08, eyeScale: 1.32, gazeX: 14, gazeY: 2, gazeMin: 1400, gazeMax: 2600, bounce: 0.006, earL: 1.4, earR: 1.06, overlay: "none", spin: 0, shake: 0, squash: 0.006, zoom: 1 },
  thinking: { turn: -18, tilt: -9, roll: 10, scale: 1.07, eyeScale: 1.2, gazeX: 10, gazeY: -6, gazeMin: 1500, gazeMax: 2800, bounce: 0.005, earL: 1.1, earR: 1.2, overlay: "dots", spin: 0, shake: 0, squash: 0.005, zoom: 1 },
  searching: { turn: 10, tilt: -6, roll: -10, scale: 1.1, eyeScale: 1.32, gazeX: 16, gazeY: 8, gazeMin: 550, gazeMax: 1150, bounce: 0.012, earL: 1.2, earR: 1.2, overlay: "sweep", spin: 0.15, shake: 0, squash: 0.01, zoom: 1 },
  working: { turn: -22, tilt: 12, roll: 6, scale: 1.04, eyeScale: 0.72, gazeX: 4, gazeY: 12, gazeMin: 1200, gazeMax: 2200, bounce: 0.007, earL: 1.08, earR: 1.08, overlay: "sweep", spin: 0.2, shake: 0, squash: 0.008, zoom: 1 },
  excited: { turn: -8, tilt: -12, roll: 16, scale: 1.14, eyeScale: 1.34, gazeX: 12, gazeY: -4, gazeMin: 700, gazeMax: 1600, bounce: 0.028, earL: 1.24, earR: 1.24, overlay: "none", spin: 0.45, shake: 0, squash: 0.02, zoom: 1 },
  surprised: { turn: -6, tilt: -8, roll: 4, scale: 1.16, eyeScale: 1.36, gazeX: 4, gazeY: -8, gazeMin: 900, gazeMax: 1800, bounce: 0.004, earL: 1.24, earR: 1.24, overlay: "none", spin: 0, shake: 0, squash: 0.004, zoom: 1 },
  suspicious: { turn: 4, tilt: -2, roll: -10, scale: 1.08, eyeScale: 1.14, gazeX: 11, gazeY: 3, gazeMin: 1100, gazeMax: 2400, bounce: 0.005, earL: 1.08, earR: 1.18, overlay: "none", spin: 0, shake: 0, squash: 0.005, zoom: 1 },
  angry: { turn: -16, tilt: 10, roll: -8, scale: 1.1, eyeScale: 0.62, gazeX: 6, gazeY: 7, gazeMin: 800, gazeMax: 1700, bounce: 0.01, earL: 1.02, earR: 1.02, overlay: "none", spin: 0, shake: 0.35, squash: 0.012, zoom: 1 },
  drowsy: { turn: -8, tilt: 10, roll: 8, scale: 1.02, eyeScale: 0.42, gazeX: 3, gazeY: 6, gazeMin: 2800, gazeMax: 5000, bounce: 0.003, earL: 1.1, earR: 1.12, overlay: "none", spin: 0, shake: 0, squash: 0.003, zoom: 1 },
  happy: { turn: -8, tilt: -16, roll: 16, scale: 1.16, eyeScale: 0.86, gazeX: 6, gazeY: -6, gazeMin: 1600, gazeMax: 3200, bounce: 0.028, earL: 1.3, earR: 1.3, overlay: "none", spin: 0.12, shake: 0, squash: 0.018, zoom: 1 },
  curious: { turn: -4, tilt: -6, roll: 2, scale: 1.1, eyeScale: 1.3, gazeX: 14, gazeY: -3, gazeMin: 900, gazeMax: 1900, bounce: 0.01, earL: 1.24, earR: 1.12, overlay: "none", spin: 0, shake: 0, squash: 0.009, zoom: 1 },
  confused: { turn: -20, tilt: 4, roll: 18, scale: 1.08, eyeScale: 1.28, gazeX: 9, gazeY: 4, gazeMin: 1000, gazeMax: 2100, bounce: 0.008, earL: 1.26, earR: 1.02, overlay: "none", spin: 0, shake: 0, squash: 0.008, zoom: 1 },
  bored: { turn: -10, tilt: 8, roll: -4, scale: 1.04, eyeScale: 0.58, gazeX: 5, gazeY: 7, gazeMin: 3000, gazeMax: 5600, bounce: 0.002, earL: 1.08, earR: 1.08, overlay: "none", spin: 0, shake: 0, squash: 0.002, zoom: 1 },
  proud: { turn: -8, tilt: -12, roll: 6, scale: 1.12, eyeScale: 1.22, gazeX: 4, gazeY: -5, gazeMin: 2000, gazeMax: 3800, bounce: 0.006, earL: 1.16, earR: 1.16, overlay: "none", spin: 0.1, shake: 0, squash: 0.006, zoom: 1 },
  shy: { turn: 8, tilt: 4, roll: 12, scale: 1.02, eyeScale: 1.16, gazeX: 13, gazeY: 6, gazeMin: 1800, gazeMax: 3400, bounce: 0.007, earL: 1.08, earR: 1.14, overlay: "none", spin: 0, shake: 0, squash: 0.007, zoom: 1 },
  sad: { turn: -8, tilt: 16, roll: 2, scale: 0.98, eyeScale: 0.48, gazeX: 2, gazeY: 10, gazeMin: 2400, gazeMax: 4200, bounce: 0.002, earL: 0.96, earR: 0.96, overlay: "none", spin: 0, shake: 0, squash: 0.002, zoom: 1 },
  laughing: { turn: -14, tilt: 4, roll: -14, scale: 1.13, eyeScale: 0.32, gazeX: 6, gazeY: 3, gazeMin: 800, gazeMax: 1500, bounce: 0.03, earL: 1.22, earR: 1.22, overlay: "none", spin: 0, shake: 0.25, squash: 0.02, zoom: 1 },
  scared: { turn: -24, tilt: -12, roll: 18, scale: 1.14, eyeScale: 1.4, gazeX: 16, gazeY: 10, gazeMin: 450, gazeMax: 1050, bounce: 0.02, earL: 1.24, earR: 1.22, overlay: "none", spin: 0, shake: 0.65, squash: 0.016, zoom: 1 },
  playful: { turn: -6, tilt: -10, roll: 20, scale: 1.12, eyeScale: 1.3, gazeX: 12, gazeY: -4, gazeMin: 700, gazeMax: 1500, bounce: 0.022, earL: 1.26, earR: 1.08, overlay: "none", spin: 0.25, shake: 0, squash: 0.015, zoom: 1 },
  celebrate: { turn: -10, tilt: -14, roll: 22, scale: 1.16, eyeScale: 1.32, gazeX: 8, gazeY: -6, gazeMin: 600, gazeMax: 1300, bounce: 0.04, earL: 1.26, earR: 1.26, overlay: "none", spin: 1.1, shake: 0, squash: 0.024, zoom: 1 },
  orbit: { turn: 0, tilt: 0, roll: 0, scale: 1.09, eyeScale: 1.28, gazeX: 3, gazeY: 2, gazeMin: 2000, gazeMax: 4000, bounce: 0, earL: 1.2, earR: 1.18, overlay: "orbit", spin: 0, shake: 0, squash: 0, zoom: 1.14 },
  radar: { turn: 0, tilt: 0, roll: 0, scale: 1.1, eyeScale: 1.3, gazeX: 4, gazeY: 2, gazeMin: 2000, gazeMax: 4000, bounce: 0, earL: 1.22, earR: 1.2, overlay: "radar", spin: 0, shake: 0, squash: 0, zoom: 1.14 },
  progress: { turn: 0, tilt: 0, roll: 0, scale: 1.11, eyeScale: 1.28, gazeX: 3, gazeY: 2, gazeMin: 2000, gazeMax: 4000, bounce: 0, earL: 1.2, earR: 1.18, overlay: "progress", spin: 0, shake: 0, squash: 0, zoom: 1.32 },
  spawning: { turn: -8, tilt: -14, roll: 6, scale: 0.86, eyeScale: 1.32, gazeX: 5, gazeY: -4, gazeMin: 1600, gazeMax: 2800, bounce: 0.015, earL: 1.26, earR: 1.26, overlay: "gather", spin: 0, shake: 0, squash: 0.01, zoom: 1.2 },
  humming: { turn: -14, tilt: -6, roll: 10, scale: 1.08, eyeScale: 1.26, gazeX: 6, gazeY: 0, gazeMin: 1800, gazeMax: 3600, bounce: 0.014, earL: 1.18, earR: 1.18, overlay: "orbs", spin: 0.55, shake: 0, squash: 0.01, zoom: 1 },
  loading: { turn: -12, tilt: -4, roll: 10, scale: 1.09, eyeScale: 1.28, gazeX: 5, gazeY: 0, gazeMin: 1400, gazeMax: 2400, bounce: 0.02, earL: 1.2, earR: 1.2, overlay: "whirl", spin: 1.6, shake: 0, squash: 0.012, zoom: 1.18 },
  dictating: { turn: -10, tilt: -6, roll: 6, scale: 1.09, eyeScale: 1.26, gazeX: 7, gazeY: 1, gazeMin: 1200, gazeMax: 2200, bounce: 0.01, earL: 1.2, earR: 1.2, overlay: "wave", spin: 0, shake: 0, squash: 0.01, zoom: 1 },
  writing: { turn: -18, tilt: 4, roll: -4, scale: 1.07, eyeScale: 1.2, gazeX: 8, gazeY: 5, gazeMin: 1400, gazeMax: 2600, bounce: 0.006, earL: 1.14, earR: 1.16, overlay: "trail", spin: 0, shake: 0, squash: 0.006, zoom: 1 },
  sending: { turn: -4, tilt: -10, roll: 12, scale: 1.12, eyeScale: 1.3, gazeX: 10, gazeY: -3, gazeMin: 900, gazeMax: 1800, bounce: 0.016, earL: 1.22, earR: 1.16, overlay: "send", spin: 0, shake: 0, squash: 0.012, zoom: 1 },
  receiving: { turn: -20, tilt: -2, roll: -4, scale: 1.1, eyeScale: 1.3, gazeX: 10, gazeY: 2, gazeMin: 900, gazeMax: 1800, bounce: 0.012, earL: 1.16, earR: 1.22, overlay: "receive", spin: 0, shake: 0, squash: 0.01, zoom: 1 },
  uploading: { turn: -10, tilt: -14, roll: 4, scale: 1.13, eyeScale: 1.26, gazeX: 4, gazeY: -6, gazeMin: 1500, gazeMax: 2800, bounce: 0.01, earL: 1.24, earR: 1.24, overlay: "dock", spin: 0, shake: 0, squash: 0.008, zoom: 1 },
  notifying: { turn: 2, tilt: -14, roll: 18, scale: 1.2, eyeScale: 1.4, gazeX: 5, gazeY: -8, gazeMin: 1000, gazeMax: 2000, bounce: 0.034, earL: 1.32, earR: 1.32, overlay: "sweep", spin: 0, shake: 0, squash: 0.02, zoom: 1 },
  alerting: { turn: -22, tilt: 2, roll: -18, scale: 1.18, eyeScale: 1.42, gazeX: 14, gazeY: 5, gazeMin: 500, gazeMax: 1100, bounce: 0.036, earL: 1.28, earR: 1.28, overlay: "none", spin: 0, shake: 1, squash: 0.024, zoom: 1 },
  dragging: { turn: 6, tilt: 4, roll: 14, scale: 1.1, eyeScale: 1.26, gazeX: 9, gazeY: 4, gazeMin: 1600, gazeMax: 3000, bounce: 0.004, earL: 1.08, earR: 1.2, overlay: "none", spin: 0, shake: 0, squash: 0.01, zoom: 1 },
  bouncing: { turn: -10, tilt: -16, roll: 8, scale: 1.16, eyeScale: 1.3, gazeX: 5, gazeY: -4, gazeMin: 1200, gazeMax: 2200, bounce: 0.055, earL: 1.22, earR: 1.22, overlay: "none", spin: 0, shake: 0, squash: 0.04, zoom: 1 },
  "powering-down": { turn: -6, tilt: 16, roll: 4, scale: 0.9, eyeScale: 0.1, gazeX: 0, gazeY: 8, gazeMin: 5000, gazeMax: 8000, bounce: 0.001, earL: 1.0, earR: 1.0, overlay: "standby", spin: 0, shake: 0, squash: 0.001, zoom: 1 },
};

export function targetsFor(state) {
  const pose = POSES[state];
  if (!pose) throw new Error(`unknown gummy state: ${state}`);
  return { ...pose };
}

export function sampleGummy(earL, earR) {
  // One sitting mass (head fused into a heavier base) + ear lobes grown out of it.
  // Construction can be circles; the read cannot — high kMass, medium kEar fillet.
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

/**
 * Silhouette ring in local space, centered on 0,0. Measured by gates/gummy-shape.mjs.
 */
export function silhouette({ earL = 1, earR = 1 } = {}) {
  return sampleGummy(earL, earR);
}

/**
 * Silhouette plus both eye ellipses for one state, in local space.
 * `gaze` in -1..1 drives the state's saccade to its extreme.
 * Measured by gates/gummy-face.mjs.
 */
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
