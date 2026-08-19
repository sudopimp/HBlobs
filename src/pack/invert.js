/**
 * Recover blob count + centers from a third-party raster (synthetic).
 * Foreground = opaque pixels; each 4-connected component is one blob.
 * Center is the component centroid (filled-circle fit).
 */
export function invertRaster(rgba, w, h) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const centers = [];

  const opaque = (i) => (rgba[i * 4 + 3] ?? 0) > 0;

  for (let i = 0; i < n; i++) {
    if (seen[i] || !opaque(i)) continue;

    let sumX = 0;
    let sumY = 0;
    let count = 0;
    const stack = [i];
    seen[i] = 1;

    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      sumX += x;
      sumY += y;
      count++;

      if (x > 0) {
        const q = p - 1;
        if (!seen[q] && opaque(q)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
      if (x + 1 < w) {
        const q = p + 1;
        if (!seen[q] && opaque(q)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
      if (y > 0) {
        const q = p - w;
        if (!seen[q] && opaque(q)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
      if (y + 1 < h) {
        const q = p + w;
        if (!seen[q] && opaque(q)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }

    if (count > 0) centers.push([sumX / count, sumY / count]);
  }

  return { count: centers.length, centers };
}
