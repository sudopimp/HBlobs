/** Containment math for eye holes against the silhouette ring. */

function distToSegment(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p[0] - a[0];
  const wy = p[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}

export function insidePolygon(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToRing(p, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const d = distToSegment(p, ring[i], ring[(i + 1) % ring.length]);
    if (d < best) best = d;
  }
  return best;
}

/** Signed clearance from the eye's outline to the silhouette edge; negative means it pokes out. */
export function eyeClearance(eye, ring, samples = 48) {
  let worst = Infinity;
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const p = [eye.cx + Math.cos(a) * eye.rx, eye.cy + Math.sin(a) * eye.ry];
    const d = distToRing(p, ring);
    const signed = insidePolygon(p, ring) ? d : -d;
    if (signed < worst) worst = signed;
  }
  return worst;
}
