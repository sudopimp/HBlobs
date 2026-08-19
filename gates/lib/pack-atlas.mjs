/** Codex atlas geometry + pixel metrics. Atlas pixels only — no recipe fields. */

export const CELL_W = 192;
export const CELL_H = 208;
export const COLS = 8;
export const ROWS = 9;
export const ATLAS_W = COLS * CELL_W;
export const ATLAS_H = ROWS * CELL_H;

export const CODEX_ROWS = [
  "idle",
  "running-right",
  "running-left",
  "waving",
  "jumping",
  "failed",
  "waiting",
  "running",
  "review",
];

export const FRAME_COUNTS = {
  idle: 6,
  "running-right": 8,
  "running-left": 8,
  waving: 4,
  jumping: 5,
  failed: 8,
  waiting: 6,
  running: 6,
  review: 6,
};

export const HERMES_ACTIVITIES = ["idle", "wave", "run", "failed", "review", "jump", "waiting"];
export const ROAM_NAMES = ["running-right", "running-left"];

const ALIAS = { wave: "waving", jump: "jumping", run: "running" };

export function expectedRow(name) {
  const rowName = ALIAS[name] ?? name;
  return CODEX_ROWS.indexOf(rowName);
}

export const ALPHA_ON = 8;
export const COPY_IOU = 0.98;
export const RIGID_IOU = 0.96;
export const SAME_CHAR_IOU_MIN = 0.5;
export const MOTION_IOU = [0.7, 0.98];
export const MOTION_TRAVEL = [8, 72];
export const PREVIEW_IOU = 0.97;
export const CONTRAST_LUMA = 50;
export const VIEWBOX = { x: -150, y: -150, w: 300, h: 300 };

export function cellRect(col, row) {
  return { x: col * CELL_W, y: row * CELL_H, w: CELL_W, h: CELL_H };
}

export function extractCell(img, col, row) {
  const { w, h, rgba } = img;
  const x0 = col * CELL_W;
  const y0 = row * CELL_H;
  if (x0 + CELL_W > w || y0 + CELL_H > h) return null;
  const out = Buffer.alloc(CELL_W * CELL_H * 4);
  for (let y = 0; y < CELL_H; y++) {
    const src = ((y0 + y) * w + x0) * 4;
    rgba.copy(out, y * CELL_W * 4, src, src + CELL_W * 4);
  }
  return { w: CELL_W, h: CELL_H, rgba: out };
}

export function maxAlpha(img) {
  const { rgba } = img;
  let m = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > m) m = rgba[i];
  return m;
}

export function usedCell(img, col, row) {
  const cell = extractCell(img, col, row);
  return cell ? maxAlpha(cell) > ALPHA_ON : false;
}

export function occupancy(img) {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let n = 0;
    for (let c = 0; c < COLS; c++) {
      if (usedCell(img, c, r)) n = c + 1;
      else break;
    }
    rows.push(n);
  }
  return rows;
}

export function maskOf(img, thresh = ALPHA_ON) {
  const { w, h, rgba } = img;
  const m = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < m.length; i++, p += 4) m[i] = rgba[p + 3] > thresh ? 1 : 0;
  return m;
}

export function iouMasks(a, b) {
  let inter = 0;
  let union = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const A = a[i];
    const B = b[i];
    inter += A & B;
    union += A | B;
  }
  return union === 0 ? 1 : inter / union;
}

export function iouImages(a, b) {
  return iouMasks(maskOf(a), maskOf(b));
}

export function centroidMask(mask, w, h) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      sx += x;
      sy += y;
      n++;
    }
  }
  if (!n) return { x: 0, y: 0, n: 0 };
  return { x: sx / n, y: sy / n, n };
}

export function centroid(img) {
  return centroidMask(maskOf(img), img.w, img.h);
}

function sampleMask(mask, w, h, x, y) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= w || iy >= h) return 0;
  return mask[iy * w + ix];
}

/** Downsampled best rotate+translate IoU. Pure rigid pairs land near 1. */
export function bestRigidIou(a, b) {
  const step = 4;
  const wa = Math.ceil(a.w / step);
  const ha = Math.ceil(a.h / step);
  const ma = new Uint8Array(wa * ha);
  const mb = new Uint8Array(wa * ha);
  const A = maskOf(a);
  const B = maskOf(b);
  for (let y = 0; y < ha; y++) {
    for (let x = 0; x < wa; x++) {
      ma[y * wa + x] = A[(y * step) * a.w + x * step] || 0;
      mb[y * wa + x] = B[(y * step) * b.w + x * step] || 0;
    }
  }
  const ca = centroidMask(ma, wa, ha);
  const cb = centroidMask(mb, wa, ha);
  let best = 0;
  for (let deg = -20; deg <= 20; deg += 2) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const warped = new Uint8Array(wa * ha);
    for (let y = 0; y < ha; y++) {
      for (let x = 0; x < wa; x++) {
        const dx = x - cb.x;
        const dy = y - cb.y;
        const sx = ca.x + dx * cos + dy * sin;
        const sy = ca.y - dx * sin + dy * cos;
        warped[y * wa + x] = sampleMask(ma, wa, ha, sx, sy);
      }
    }
    const v = iouMasks(warped, mb);
    if (v > best) best = v;
  }
  return best;
}

export function isPureRigid(a, b) {
  return bestRigidIou(a, b) >= RIGID_IOU;
}

export function floodFromCorners(img, floor = 16) {
  const { w, h, rgba } = img;
  const seen = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i]) return;
    if (rgba[i * 4 + 3] > floor) return;
    seen[i] = 1;
    q.push(i);
  };
  push(0, 0);
  push(w - 1, 0);
  push(0, h - 1);
  push(w - 1, h - 1);
  while (q.length) {
    const i = q.pop();
    const x = i % w;
    const y = (i - x) / w;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return seen;
}

/** Opaque pixels the corner flood never reached — leftover painted backdrop. */
export function leftoverOpaque(img, floor = 16) {
  const seen = floodFromCorners(img, floor);
  const { w, h, rgba } = img;
  let n = 0;
  for (let i = 0; i < seen.length; i++) {
    if (!seen[i] && rgba[i * 4 + 3] > floor) n++;
  }
  return n;
}

export function unusedColumnOpaque(img) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    const used = FRAME_COUNTS[CODEX_ROWS[r]];
    for (let c = used; c < COLS; c++) {
      const cell = extractCell(img, c, r);
      if (cell && maxAlpha(cell) > 0) n++;
    }
  }
  return n;
}

export function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Fill vs hole luminance on atlas pixels. Holes = dark interior inside the body. */
export function contrastDelta(img) {
  const { w, h, rgba } = img;
  const mask = maskOf(img, 32);
  const fills = [];
  const holes = [];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      const p = i * 4;
      const a = rgba[p + 3];
      const L = luma(rgba[p], rgba[p + 1], rgba[p + 2]);
      if (mask[i] && L >= 40) fills.push(L);
      if (mask[i] && L < 40 && a > 32) holes.push(L);
      if (!mask[i] && a <= 32) {
        let bodyN = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (mask[(y + dy) * w + (x + dx)]) bodyN++;
        }
        if (bodyN >= 2) holes.push(L);
      }
    }
  }
  if (!fills.length || !holes.length) return 0;
  fills.sort((x, y) => x - y);
  holes.sort((x, y) => x - y);
  return fills[Math.floor(fills.length / 2)] - holes[Math.floor(holes.length / 2)];
}

export function insidePoly(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function rasterRing(ring, box = VIEWBOX, n = 80) {
  const mask = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = box.x + ((i + 0.5) / n) * box.w;
      const y = box.y + ((j + 0.5) / n) * box.h;
      if (insidePoly([x, y], ring)) mask[j * n + i] = 1;
    }
  }
  return { mask, n };
}
