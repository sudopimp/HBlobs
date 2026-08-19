import { eyeWidthScale } from "./face.js";

export function expAlpha(a, dt) {
  return 1 - (1 - a) ** (60 * dt);
}

export function spring(x = 0) {
  return { x, v: 0, t: x };
}

export function poseSprings(pose) {
  return {
    turn: spring(pose.turn),
    tilt: spring(pose.tilt),
    roll: spring(pose.roll),
    scale: spring(pose.scale),
    sy: spring(1),
    x: spring(0),
    y: spring(0),
    eyeOpen: spring(pose.eyeScale),
    eyeSize: spring(eyeWidthScale(pose.eyeScale)),
    gazeX: spring(0),
    gazeY: spring(0),
    earL: spring(pose.earL),
    earR: spring(pose.earR),
    morph: spring(pose.overlay === "none" ? 0 : 1),
    zoom: spring(pose.zoom),
    badge: spring(0),
  };
}

export function stepSpring(s, dt, omega, zeta) {
  s.v += (-2 * zeta * omega * s.v - omega * omega * (s.x - s.t)) * dt;
  s.x += s.v * dt;
}

export function bounceParabola(t, heights, durs) {
  const total = durs.reduce((a, b) => a + b, 0);
  let u = t % total;
  for (let i = 0; i < heights.length; i++) {
    if (u < durs[i]) {
      const p = u / durs[i];
      return -4 * heights[i] * p * (1 - p);
    }
    u -= durs[i];
  }
  return 0;
}
