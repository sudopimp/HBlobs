/**
 * Sample a compiled SDF on a grid and count bounded air pockets (sdf > 0
 * components that do not touch the grid border). An interior hole is one
 * extra complement component — not a painted DOM ellipse.
 */

export function holeCount(sdf, { lo = -64, hi = 64, n = 65 } = {}) {
  if (typeof sdf !== "function") return -1;
  const air = Array.from({ length: n }, (_, j) =>
    Array.from({ length: n }, (_, i) => {
      const x = lo + (i / (n - 1)) * (hi - lo);
      const y = lo + (j / (n - 1)) * (hi - lo);
      return sdf(x, y) > 0;
    }),
  );
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const push = (q, i, j) => {
    if (i < 0 || j < 0 || i >= n || j >= n) return;
    if (seen[j][i] || !air[j][i]) return;
    seen[j][i] = true;
    q.push([i, j]);
  };
  const flood = (seeds) => {
    const q = [];
    for (const [i, j] of seeds) push(q, i, j);
    while (q.length) {
      const [i, j] = q.pop();
      push(q, i + 1, j);
      push(q, i - 1, j);
      push(q, i, j + 1);
      push(q, i, j - 1);
    }
  };

  const border = [];
  for (let i = 0; i < n; i++) {
    border.push([i, 0], [i, n - 1]);
  }
  for (let j = 0; j < n; j++) {
    border.push([0, j], [n - 1, j]);
  }
  flood(border);

  let holes = 0;
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      if (!air[j][i] || seen[j][i]) continue;
      holes += 1;
      flood([[i, j]]);
    }
  }
  return holes;
}

export function paintedHoles(api) {
  const fromGeom = api?.faceGeometry?.()?.holes;
  if (Array.isArray(fromGeom) && fromGeom.length) return fromGeom;
  const fromRecipe = api?.recipe?.holes;
  if (Array.isArray(fromRecipe) && fromRecipe.length) return fromRecipe;
  return [];
}
