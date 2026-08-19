import { clamp, smin, smax, sdfCapsule, sdfRbox, traceSdf, mirrorRing } from "./sdf.js";
import { spring, poseSprings, stepSpring, bounceParabola, expAlpha } from "./spring.js";
import {
  CX,
  FACE,
  mapPoint,
  mapPointSphere,
  pathFromRing,
  contourPath,
  eyeEllipse,
  eyeWidthScale,
  eyePathAt,
  mouthPath,
  idleGazeTarget,
} from "./face.js";
import { blinkLid, blinkOpenY } from "./blink.js";
import { drawFx } from "./overlays.js";

const RING_N = 128;
const SUBSTEP = 1 / 120;
const BLINK_SPAN = 8000;

function svgMarkup(clipId, holes = []) {
  const sats = Array.from({ length: 5 }, (_, i) => `<circle data-sat="${i}" r="5.2" fill="var(--fg)" opacity="0"/>`).join("");
  const pings = Array.from(
    { length: 3 },
    (_, i) => `<circle data-ping="${i}" cx="${CX}" cy="${CX}" r="40" fill="none" stroke="var(--fg)" stroke-width="3.4" opacity="0"/>`,
  ).join("");
  const dots = Array.from({ length: 4 }, (_, i) => `<circle data-dot="${i}" r="4.2" fill="var(--fg)" opacity="0"/>`).join("");
  const holePaths = holes
    .map((h) => `<path data-hole="${h.id}" fill="var(--bg)"/>`)
    .join("");
  const coreId = `${clipId}-core`;
  const softId = `${clipId}-soft`;
  return `<svg viewBox="-15 -15 259 259" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <clipPath id="${clipId}"><path data-clip></path></clipPath>
    <radialGradient id="${coreId}" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".32"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="${softId}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.4"/>
    </filter>
  </defs>
  <g data-face>
    <path data-layer="body" fill="var(--fg)"/>
    <g clip-path="url(#${clipId})">
      <ellipse data-layer="core" cx="${CX}" cy="${CX}" rx="58" ry="64" fill="url(#${coreId})" opacity="0"/>
      <ellipse data-inner-ear="l" cx="${CX - 46}" cy="${CX - 52}" rx="9" ry="8" fill="var(--bg)" opacity="0"/>
      <ellipse data-inner-ear="r" cx="${CX + 46}" cy="${CX - 52}" rx="9" ry="8" fill="var(--bg)" opacity="0"/>
      <ellipse data-layer="gloss-main" cx="${CX - 18}" cy="${CX - 28}" rx="22" ry="12" fill="#fff" opacity="0" filter="url(#${softId})"/>
      <ellipse data-layer="gloss-ear-l" cx="${CX - 50}" cy="${CX - 62}" rx="9" ry="6" fill="#fff" opacity="0" filter="url(#${softId})"/>
      <ellipse data-layer="gloss-ear-r" cx="${CX + 50}" cy="${CX - 62}" rx="9" ry="6" fill="#fff" opacity="0" filter="url(#${softId})"/>
      <path data-layer="eye-l" fill="var(--bg)"/>
      <path data-layer="eye-r" fill="var(--bg)"/>
      ${holePaths}
      <path data-layer="mouth" fill="var(--bg)" opacity="0"/>
    </g>
    <g data-fx>
      ${sats}${pings}${dots}
      <circle data-progress-track cx="${CX}" cy="${CX}" r="62" fill="none" stroke="var(--fg)" stroke-width="5" opacity="0"/>
      <circle data-progress-arc cx="${CX}" cy="${CX}" r="62" fill="none" stroke="var(--fg)" stroke-width="5" stroke-linecap="round" opacity="0"/>
      <circle data-badge cx="${CX + 52}" cy="${CX - 48}" r="8" fill="var(--fg)" stroke="var(--bg)" stroke-width="2.4" opacity="0"/>
    </g>
  </g>
</svg>`;
}

function hostStyle(fill) {
  return `
:host {
  --fg: var(--blob-fill, ${fill});
  --bg: var(--blob-eye, #111110);
  display: inline-block;
  line-height: 0;
  vertical-align: middle;
  user-select: none;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
`;
}

const ElementBase = typeof HTMLElement === "undefined" ? class {} : HTMLElement;
let uid = 0;

function poseDefaults(pose) {
  return {
    turn: -16,
    tilt: -7,
    roll: 12,
    scale: 1.09,
    eyeScale: 1.28,
    gazeX: 0,
    gazeY: 0,
    gazeMin: 2500,
    gazeMax: 5500,
    bounce: 0.01,
    overlay: "none",
    spin: 0,
    shake: 0,
    squash: 0.01,
    zoom: 1,
    earL: 1,
    earR: 1,
    ...pose,
  };
}

export function defineBlob(recipe) {
  if (!recipe || typeof recipe !== "object") throw new Error("recipe is required");
  const body = recipe.body;
  if (!Array.isArray(body) || body.length === 0) {
    throw new Error("recipe body is required");
  }

  const states = recipe.states ?? {};
  const STATES = Object.keys(states);
  const face = { ...FACE, ...(recipe.face ?? {}) };
  const BLINK_MIN = recipe.blink?.min ?? 6000;
  const mouthless = new Set(recipe.mouthless ?? []);
  const freezeOverlays = recipe.freezeOverlays ?? [];
  const params = recipe.params ?? {};
  const holes = Array.isArray(recipe.holes) ? recipe.holes : [];
  const fill = recipe.fill ?? "#e84a9a";
  const sphere = face.project === "sphere";
  const upright = face.upright === true;
  const disk = sphere || upright;
  const radius = Number.isFinite(face.radius) ? face.radius : 72;
  const finishFlat = recipe.finish === "flat";

  function radiusOf(op, opts = {}) {
    let r = op.r;
    const key = op.rParam;
    if (key && Number.isFinite(params[key])) r = params[key];
    if (key && Number.isFinite(opts[key])) r *= opts[key];
    return r;
  }

  function sdfFor(opts = {}) {
    const nodes = Object.create(null);
    for (const op of body) {
      if (op.type === "circle") {
        const r = radiusOf(op, opts);
        const x = op.x;
        const y = op.y;
        nodes[op.id] = (px, py) => Math.hypot(px - x, py - y) - r;
      } else if (op.type === "capsule") {
        const r = radiusOf(op, opts);
        const ax = op.ax;
        const ay = op.ay;
        const bx = op.bx;
        const by = op.by;
        nodes[op.id] = (px, py) => sdfCapsule(px, py, ax, ay, bx, by, r);
      } else if (op.type === "rbox") {
        const r = radiusOf(op, opts);
        const x = op.x;
        const y = op.y;
        const w = op.w;
        const h = op.h;
        nodes[op.id] = (px, py) => sdfRbox(px, py, x, y, w, h, r);
      } else if (op.type === "smin") {
        const a = nodes[op.a];
        const b = nodes[op.b];
        if (typeof a !== "function" || typeof b !== "function") {
          throw new Error(`smin "${op.id}" references a node that is not yet defined`);
        }
        const k = op.k;
        nodes[op.id] = (px, py) => smin(a(px, py), b(px, py), k);
      } else if (op.type === "subtract") {
        const a = nodes[op.a];
        const b = nodes[op.b];
        if (typeof a !== "function" || typeof b !== "function") {
          throw new Error(`subtract "${op.id}" references a node that is not yet defined`);
        }
        const k = op.k;
        nodes[op.id] = (px, py) => smax(a(px, py), -b(px, py), k);
      } else if (op.type === "smax") {
        const a = nodes[op.a];
        const b = nodes[op.b];
        if (typeof a !== "function" || typeof b !== "function") {
          throw new Error(`smax "${op.id}" references a node that is not yet defined`);
        }
        const k = op.k;
        nodes[op.id] = (px, py) => smax(a(px, py), b(px, py), k);
      } else {
        throw new Error(`unknown body op "${op.type}"`);
      }
    }
    const root = body[body.length - 1];
    const sdf = nodes[root.id];
    if (typeof sdf !== "function") throw new Error("body root is not a compiled SDF");
    return sdf;
  }

  function startPoint(opts = {}) {
    let best = null;
    for (const op of body) {
      if (op.type === "circle") {
        const r = radiusOf(op, opts);
        if (!best || r > best.r) best = { x: op.x, y: op.y + r, r };
      } else if (op.type === "capsule") {
        const r = radiusOf(op, opts);
        const x = (op.ax + op.bx) / 2;
        const y = (op.ay + op.by) / 2;
        if (!best || r > best.r) best = { x, y: y + r, r };
      } else if (op.type === "rbox") {
        const r = radiusOf(op, opts);
        if (!best || r > best.r) best = { x: op.x, y: op.y + op.h / 2, r };
      }
    }
    if (!best) return { x: 0, y: 80 };
    return { x: best.x, y: best.y };
  }

  function targetsFor(state) {
    const pose = states[state];
    if (!pose) throw new Error(`unknown state: ${state}`);
    return { ...pose };
  }

  function silhouette(opts = {}) {
    const sdf = sdfFor(opts);
    const start = startPoint(opts);
    let pts = traceSdf(sdf, RING_N, start.x, start.y);
    const earL = opts.earL ?? 1;
    const earR = opts.earR ?? 1;
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

  function eyeAt(side, openY, size, gazeX, gazeY, wink) {
    if (!recipe.face) return eyeEllipse(side, openY, size, gazeX, gazeY, wink);
    const gap = 22 * face.gap;
    const ox = Number.isFinite(face.ox) ? face.ox : 0;
    const oy = Number.isFinite(face.oy) ? face.oy : 0;
    return {
      cx: clamp(side * gap * 0.5 + gazeX * 0.16, -42, 42) + ox,
      cy: clamp(2 * face.height + gazeY * 0.14, -20, 16) + oy,
      rx: 10.2 * face.eyeWidth * face.size * size,
      ry: 10.2 * face.eyeHeight * face.size * size * Math.max(openY, 0.04) * wink,
    };
  }

  function faceGeometry(state, { gaze = 0 } = {}) {
    if (!STATES.includes(state)) {
      state = STATES.includes("idle") ? "idle" : STATES[0];
    }
    const pose = targetsFor(state);
    const size = eyeWidthScale(pose.eyeScale ?? 1);
    const gazeX = (pose.gazeX ?? 0) * gaze;
    const gazeY = (pose.gazeY ?? 0) * gaze;
    const silOpts = {};
    if (pose.earL != null) silOpts.earL = pose.earL;
    if (pose.earR != null) silOpts.earR = pose.earR;
    const openY = pose.eyeScale ?? 1;
    return {
      ring: silhouette(silOpts),
      eyes: [
        eyeAt(-1, openY, size, gazeX, gazeY, 1),
        eyeAt(1, openY, size, gazeX, gazeY, 1),
      ],
      holes: holes.map((h) => ({ ...h })),
    };
  }

  function blinksOn(state) {
    const pose = states[state];
    if (!pose) throw new Error(`unknown state: ${state}`);
    if (Array.isArray(recipe.blink?.on)) return recipe.blink.on.includes(state);
    if (Array.isArray(recipe.blink?.off) && recipe.blink.off.includes(state)) return false;
    if (freezeOverlays.includes(pose.overlay)) return false;
    return true;
  }

  class BlobElement extends ElementBase {
    static get observedAttributes() {
      return ["state", "size", "follow", "paused", "skin"];
    }

    constructor() {
      super();
      this._state = STATES.includes("idle") ? "idle" : STATES[0];
      this._skin = "flat";
      this._raf = 0;
      this._t0 = 0;
      this._last = 0;
      this._clipId = `blob-clip-${++uid}`;
      this._ringLocal = silhouette();
      this._earKey = "1,1";
      this._pointer = null;
      this._gaze = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
      this._blinkT0 = 0;
      this._nextBlink = BLINK_MIN + Math.random() * BLINK_SPAN;
      this._double = false;
      this._snapped = false;
      this._gazeState = null;
      this._onMove = (ev) => {
        this._pointer = { x: ev.clientX, y: ev.clientY };
      };
      if (typeof this.attachShadow !== "function") return;
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${hostStyle(fill)}</style>${svgMarkup(this._clipId, holes)}`;
      this._els = {
        svg: root.querySelector("svg"),
        face: root.querySelector("[data-face]"),
        body: root.querySelector("[data-layer=body]"),
        clip: root.querySelector("[data-clip]"),
        core: root.querySelector("[data-layer=core]"),
        innerEarL: root.querySelector("[data-inner-ear=l]"),
        innerEarR: root.querySelector("[data-inner-ear=r]"),
        glossMain: root.querySelector("[data-layer=gloss-main]"),
        glossEarL: root.querySelector("[data-layer=gloss-ear-l]"),
        glossEarR: root.querySelector("[data-layer=gloss-ear-r]"),
        eyeL: root.querySelector("[data-layer=eye-l]"),
        eyeR: root.querySelector("[data-layer=eye-r]"),
        mouth: root.querySelector("[data-layer=mouth]"),
        holes: [...root.querySelectorAll("[data-hole]")],
        sats: [...root.querySelectorAll("[data-sat]")],
        pings: [...root.querySelectorAll("[data-ping]")],
        dots: [...root.querySelectorAll("[data-dot]")],
        track: root.querySelector("[data-progress-track]"),
        arc: root.querySelector("[data-progress-arc]"),
        badge: root.querySelector("[data-badge]"),
      };
    }

    get state() {
      return this._state;
    }
    set state(v) {
      this.setAttribute("state", v);
    }

    get skin() {
      return this._skin;
    }
    set skin(v) {
      this.setAttribute("skin", v === "gummy" ? "gummy" : "flat");
    }

    connectedCallback() {
      this._applyAttrs();
      this._bindFollow();
      if (typeof requestAnimationFrame !== "function") return;
      this._t0 = performance.now();
      this._last = this._t0;
      this._tick = this._tick.bind(this);
      this._raf = requestAnimationFrame(this._tick);
    }

    disconnectedCallback() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (typeof window !== "undefined") window.removeEventListener("pointermove", this._onMove);
    }

    attributeChangedCallback() {
      this._applyAttrs();
      this._bindFollow();
    }

    _applyAttrs() {
      const raw = this.getAttribute("state") || this._state || "idle";
      this._state = STATES.includes(raw) ? raw : STATES.includes("idle") ? "idle" : STATES[0];
      this.setAttribute("data-state", this._state);
      const size = this.getAttribute("size");
      if (size) this.style.width = `${Number(size)}px`;
      this._skin = this.getAttribute("skin") === "gummy" ? "gummy" : "flat";
      this.setAttribute("data-skin", this._skin);
      const pose = poseDefaults(targetsFor(this._state));
      if (!this._snapped) {
        this._spr = poseSprings(pose);
        this._snapped = true;
      }
      if (this._gazeState !== this._state) {
        this._gazeState = this._state;
        this._gaze.x = pose.gazeX;
        this._gaze.y = pose.gazeY;
        this._gaze.tx = pose.gazeX;
        this._gaze.ty = pose.gazeY;
      }
    }

    _bindFollow() {
      if (typeof window === "undefined") return;
      const on = this.hasAttribute("follow");
      window.removeEventListener("pointermove", this._onMove);
      if (on) window.addEventListener("pointermove", this._onMove, { passive: true });
      else this._pointer = null;
    }

    _tick(now) {
      this._raf = requestAnimationFrame(this._tick);
      if (this.hasAttribute("paused") || !this._els) return;
      const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      let dt = (now - this._last) / 1000;
      this._last = now;
      if (dt > 0.1) dt = 0.1;
      const t = (now - this._t0) / 1000;
      const pose = poseDefaults(targetsFor(this._state));
      const frozen = freezeOverlays.includes(pose.overlay);

      let turnT = frozen ? 0 : pose.turn;
      let tiltT = frozen ? 0 : pose.tilt;
      let rollT = frozen ? 0 : pose.roll;
      let scaleT = pose.scale;
      let syT = 1;
      let xT = 0;
      let yT = 0;
      let earL = pose.earL;
      let earR = pose.earR;
      let morphT = pose.overlay === "none" ? 0 : 1;
      let zoomT = pose.zoom;

      if (!reduce && !frozen) {
        const St = t;
        turnT += Math.sin(0.5 * St) * 1.5 + Math.sin(0.17 * St) * 0.6;
        xT += Math.sin(0.27 * St) * 1;
        yT += Math.sin(0.85 * St) * 1.2;
        syT = 1 + Math.sin(0.85 * St) * pose.squash;
        if (pose.bounce > 0.04) {
          yT += bounceParabola(t, [48, 28, 14, 6], [0.5, 0.382, 0.27, 0.177]);
        }
        if (pose.spin) {
          turnT += Math.sin(t * pose.spin * 2.2) * 16;
          rollT += Math.cos(t * pose.spin * 1.6) * 10;
        }
        if (pose.shake) {
          turnT += Math.sin(t * 28) * 4 * pose.shake;
          rollT += Math.cos(t * 31) * 3 * pose.shake;
        }
      }

      if (this.hasAttribute("follow") && this._pointer) {
        const box = this.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const px = clamp((this._pointer.x - cx) / 14, -16, 16);
        const py = clamp((this._pointer.y - cy) / 18, -12, 12);
        this._gaze.tx = px;
        this._gaze.ty = py;
        if (!frozen) {
          turnT += px * 0.35;
          tiltT += py * 0.28;
        }
      } else if (now > this._gaze.until) {
        const held = idleGazeTarget(pose);
        this._gaze.tx = held.x;
        this._gaze.ty = held.y;
        this._gaze.until = now + pose.gazeMin + Math.random() * (pose.gazeMax - pose.gazeMin);
      }

      let openT = pose.eyeScale;
      let lid = 1;
      if (!reduce && blinksOn(this._state)) {
        if (!this._blinkT0 && now > this._nextBlink) {
          this._blinkT0 = now;
          this._double = Math.random() < 0.14;
          this._nextBlink = now + BLINK_MIN + Math.random() * BLINK_SPAN;
        }
        if (this._blinkT0) {
          const k = blinkLid(now - this._blinkT0, this._double);
          if (k == null) this._blinkT0 = 0;
          else lid = k;
        }
      }

      if (reduce) {
        turnT = pose.turn;
        tiltT = pose.tilt;
        rollT = pose.roll;
        scaleT = pose.scale;
        syT = 1;
        xT = 0;
        yT = 0;
        openT = pose.eyeScale;
        morphT = pose.overlay === "none" ? 0 : 1;
      }

      const s = this._spr;
      s.turn.t = turnT;
      s.tilt.t = tiltT;
      s.roll.t = rollT;
      s.scale.t = scaleT;
      s.sy.t = syT;
      s.x.t = xT;
      s.y.t = yT;
      s.eyeOpen.t = openT;
      s.eyeSize.t = eyeWidthScale(pose.eyeScale);
      s.earL.t = earL;
      s.earR.t = earR;
      s.morph.t = morphT;
      s.zoom.t = zoomT;
      s.badge.t = 0;

      const aGaze = expAlpha(0.16, dt);
      this._gaze.x += (this._gaze.tx - this._gaze.x) * aGaze;
      this._gaze.y += (this._gaze.ty - this._gaze.y) * aGaze;
      s.gazeX.t = this._gaze.x;
      s.gazeY.t = this._gaze.y;

      const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        stepSpring(s.turn, h, 5, 0.9);
        stepSpring(s.tilt, h, 5, 0.9);
        stepSpring(s.roll, h, 5, 0.9);
        stepSpring(s.scale, h, 8, 1);
        stepSpring(s.sy, h, 10, 0.8);
        stepSpring(s.x, h, 3.5, 1);
        stepSpring(s.y, h, 4, 1);
        stepSpring(s.eyeOpen, h, 26, 1);
        stepSpring(s.eyeSize, h, 9, 0.85);
        stepSpring(s.gazeX, h, 13, 1);
        stepSpring(s.gazeY, h, 13, 1);
        stepSpring(s.earL, h, 10, 1);
        stepSpring(s.earR, h, 10, 1);
        stepSpring(s.morph, h, 14, 1);
        stepSpring(s.zoom, h, 11, 1);
        stepSpring(s.badge, h, 9, 0.55);
      }

      const earKey = `${s.earL.x.toFixed(3)},${s.earR.x.toFixed(3)}`;
      if (earKey !== this._earKey) {
        this._ringLocal = silhouette({ earL: s.earL.x, earR: s.earR.x });
        this._earKey = earKey;
      }

      const ox = Number.isFinite(face.ox) ? face.ox : 0;
      const oy = Number.isFinite(face.oy) ? face.oy : 0;
      const mapFn = (x, y) => {
        const a = disk ? s.roll.x * (Math.PI / 180) : 0;
        const xr = x * Math.cos(a) - y * Math.sin(a) + ox;
        const yr = x * Math.sin(a) + y * Math.cos(a) + oy;
        if (sphere) return mapPointSphere(xr, yr, s.turn.x, s.tilt.x, radius);
        return mapPoint(xr, yr, s.turn.x, s.tilt.x);
      };

      const ring = this._ringLocal.map(([x, y]) =>
        disk ? [CX + x, CX + y] : mapPoint(x, y, s.turn.x, s.tilt.x),
      );
      const d = pathFromRing(ring);
      this._els.body.setAttribute("d", d);
      this._els.clip.setAttribute("d", d);

      const openY = blinkOpenY(lid, pose.eyeScale);
      this._els.eyeL.setAttribute(
        "d",
        eyePathAt(mapFn, -1, openY, s.eyeSize.x, s.gazeX.x, s.gazeY.x, s.turn.x, s.tilt.x, 1, face),
      );
      this._els.eyeR.setAttribute(
        "d",
        eyePathAt(mapFn, 1, openY, s.eyeSize.x, s.gazeX.x, s.gazeY.x, s.turn.x, s.tilt.x, 1, face),
      );
      for (const el of this._els.holes) {
        const spec = holes.find((h) => h.id === el.getAttribute("data-hole"));
        if (!spec) continue;
        el.setAttribute("d", contourPath(mapFn, spec.cx, spec.cy, spec.rx, spec.ry, s.turn.x, s.tilt.x));
      }

      const gummy = !finishFlat && this._skin === "gummy";
      const showMouth = gummy && !mouthless.has(this._state);
      this._els.core.setAttribute("opacity", gummy ? "1" : "0");
      this._els.innerEarL.setAttribute("opacity", gummy ? "0.16" : "0");
      this._els.innerEarR.setAttribute("opacity", gummy ? "0.16" : "0");
      this._els.glossMain.setAttribute("opacity", gummy ? "0.55" : "0");
      this._els.glossEarL.setAttribute("opacity", gummy ? "0.5" : "0");
      this._els.glossEarR.setAttribute("opacity", gummy ? "0.5" : "0");
      this._els.mouth.setAttribute("opacity", showMouth ? "1" : "0");
      if (gummy) {
        const place = (el, x, y, rx, ry) => {
          const [cx, cy] = mapPoint(x, y, s.turn.x, s.tilt.x);
          el.setAttribute("cx", cx.toFixed(2));
          el.setAttribute("cy", cy.toFixed(2));
          if (rx) el.setAttribute("rx", String(rx));
          if (ry) el.setAttribute("ry", String(ry));
        };
        place(this._els.core, 0, 10, 56, 62);
        place(this._els.innerEarL, -46, -52, 9, 8);
        place(this._els.innerEarR, 46, -52, 9, 8);
        place(this._els.glossMain, -14, -16, 24, 13);
        place(this._els.glossEarL, -50, -60, 7, 6);
        place(this._els.glossEarR, 50, -60, 7, 6);
        this._els.mouth.setAttribute("d", mouthPath(s.turn.x, s.tilt.x));
      }

      const sy = s.scale.x * s.sy.x * (1 - s.tilt.x * 0.002);
      const sx = s.scale.x / Math.max(s.sy.x, 0.72);
      const rot = disk ? 0 : s.turn.x * 0.55 + s.roll.x * 0.45;
      this._els.face.setAttribute(
        "transform",
        `translate(${CX + s.x.x} ${CX + s.y.x}) rotate(${rot}) scale(${sx} ${sy}) translate(${-CX} ${-CX})`,
      );

      const half = 129.5 / (1 + (s.zoom.x - 1) * 0.92);
      const vb = 114.5 - half;
      this._els.svg.setAttribute("viewBox", `${vb} ${vb} ${half * 2} ${half * 2}`);

      drawFx(this._els, t, s.morph.x, pose.overlay, reduce, CX);
      this._els.badge.setAttribute("opacity", String(s.badge.x));
      this._els.badge.setAttribute("transform", `translate(0 ${-s.badge.x * 4}) scale(${0.4 + s.badge.x * 0.6})`);
    }
  }

  if (typeof customElements !== "undefined" && recipe.tag && !customElements.get(recipe.tag)) {
    customElements.define(recipe.tag, BlobElement);
  }

  return {
    CUSTOM_ELEMENT: recipe.tag,
    FILL: fill,
    STATES,
    recipe,
    targetsFor,
    silhouette,
    sdf(x, y) { return sdfFor()(x, y); },
    sdfFor,
    faceGeometry,
    blinksOn,
    BLINK_MIN,
    BlobElement,
  };
}

export default defineBlob;
