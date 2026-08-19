export function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

export function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return a * h + b * (1 - h) - k * h * (1 - h);
}

export function smax(a, b, k) {
  if (!k) return Math.max(a, b);
  return -smin(-a, -b, k);
}

export function sdfCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const baba = bax * bax + bay * bay;
  const h = baba > 0 ? clamp((pax * bax + pay * bay) / baba, 0, 1) : 0;
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

export function sdfRbox(px, py, x, y, w, h, r) {
  const qx = Math.abs(px - x) - w * 0.5 + r;
  const qy = Math.abs(py - y) - h * 0.5 + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

export function sdfGrad(sdf, x, y) {
  const e = 0.35;
  const gx = sdf(x + e, y) - sdf(x - e, y);
  const gy = sdf(x, y + e) - sdf(x, y - e);
  const g = Math.hypot(gx, gy) || 1;
  return [gx / g, gy / g];
}

export function sdfProject(sdf, x, y) {
  for (let i = 0; i < 6; i++) {
    const d = sdf(x, y);
    const [nx, ny] = sdfGrad(sdf, x, y);
    x -= d * nx;
    y -= d * ny;
  }
  return [x, y];
}

export function resampleClosed(raw, n) {
  if (raw.length < 8) return raw;
  const dist = [0];
  let len = 0;
  for (let i = 1; i < raw.length; i++) {
    len += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
    dist.push(len);
  }
  len += Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]);
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * len;
    while (j < dist.length - 1 && dist[j + 1] < t) j++;
    const a = raw[j];
    const b = raw[(j + 1) % raw.length];
    const span = (j + 1 < dist.length ? dist[j + 1] : len) - dist[j] || 1;
    const u = clamp((t - dist[j]) / span, 0, 1);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}

export function traceSdf(sdf, n, startX, startY) {
  let [x, y] = sdfProject(sdf, startX, startY);
  const x0 = x;
  const y0 = y;
  const raw = [];
  const step = 2.1;
  for (let i = 0; i < 3600; i++) {
    raw.push([x, y]);
    const [nx, ny] = sdfGrad(sdf, x, y);
    x += -ny * step;
    y += nx * step;
    [x, y] = sdfProject(sdf, x, y);
    if (i > 48 && Math.hypot(x - x0, y - y0) < step * 0.9) break;
  }
  return resampleClosed(raw, n);
}

export function mirrorRing(pts) {
  const n = pts.length;
  return pts.map(([x, y]) => {
    let best = 0;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      const d = (pts[j][0] + x) ** 2 + (pts[j][1] - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return [(x - pts[best][0]) / 2, (y + pts[best][1]) / 2];
  });
}
