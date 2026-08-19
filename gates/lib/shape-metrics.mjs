/**
 * Geometry measurements for the silhouette ring.
 * Shared so real impl and must-fail twins are judged identically.
 */

export function bbox(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Rotate so index 0 sits at the bottom, making the top arc a contiguous middle run. */
export function rotateToBottom(ring) {
  let at = 0;
  for (let i = 1; i < ring.length; i++) {
    if (ring[i][1] > ring[at][1]) at = i;
  }
  return [...ring.slice(at), ...ring.slice(0, at)];
}

/**
 * Ears are the two highest points either side of center, and the crown between them
 * must sit lower than both. A smooth dome yields prominence <= 0 and reports 0 ears.
 */
export function earMetrics(ring) {
  const box = bbox(ring);
  const rot = rotateToBottom(ring);
  const offCenter = box.w * 0.075;

  let li = -1;
  let ri = -1;
  for (let i = 0; i < rot.length; i++) {
    const [x, y] = rot[i];
    if (x < -offCenter && (li < 0 || y < rot[li][1])) li = i;
    if (x > offCenter && (ri < 0 || y < rot[ri][1])) ri = i;
  }
  if (li < 0 || ri < 0) return { count: 0, reason: "no points either side of center", box };

  const from = Math.min(li, ri);
  const to = Math.max(li, ri);
  let crownY = -Infinity;
  for (let i = from; i <= to; i++) {
    if (rot[i][1] > crownY) crownY = rot[i][1];
  }

  const peakY = Math.max(rot[li][1], rot[ri][1]);
  const prominence = (crownY - peakY) / box.h;
  if (prominence < 0.03) {
    return { count: prominence > 0 ? 1 : 0, prominence, crownY, box, reason: "no crown dip between the two high points" };
  }

  const lobe = (peakIdx) => {
    let a = peakIdx;
    let b = peakIdx;
    while (a > 0 && rot[a][1] < crownY) a--;
    while (b < rot.length - 1 && rot[b][1] < crownY) b++;
    let minX = Infinity;
    let maxX = -Infinity;
    let tipY = Infinity;
    for (let i = a; i <= b; i++) {
      if (rot[i][0] < minX) minX = rot[i][0];
      if (rot[i][0] > maxX) maxX = rot[i][0];
      if (rot[i][1] < tipY) tipY = rot[i][1];
    }
    const h = crownY - tipY;
    const w = maxX - minX;
    return { w, h, ratio: h > 0 ? w / h : Infinity, span: b - a };
  };

  return {
    count: 2,
    prominence,
    crownY,
    box,
    left: lobe(li),
    right: lobe(ri),
  };
}

function segmentsCross(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function selfIntersections(ring) {
  const n = ring.length;
  const hits = [];
  for (let i = 0; i < n; i++) {
    const a1 = ring[i];
    const a2 = ring[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = ring[j];
      const b2 = ring[(j + 1) % n];
      if (segmentsCross(a1, a2, b1, b2)) hits.push([i, j]);
    }
  }
  return hits;
}
