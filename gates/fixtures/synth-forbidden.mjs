/**
 * Synthetic forbidden starter — not a copy of any product recipe.
 * Fingerprint the private gate must reject if this graph lands under src/recipes/:
 * near-red fill, three cut holes, sitting-head aspect ~0.86.
 * Tag/filename are innocent on purpose (head, not skull).
 */
export const FILL = "#b01018";

export const recipe = {
  schemaVersion: 0,
  tag: "head-blob",
  fill: FILL,
  body: [
    { type: "circle", id: "dome", x: 0, y: -6, r: 50 },
    { type: "circle", id: "chin", x: 0, y: 26, r: 34 },
    { type: "smin", id: "mass", a: "dome", b: "chin", k: 16 },
  ],
  holes: [
    { id: "cut-a", cx: -14, cy: -6, rx: 7, ry: 10 },
    { id: "cut-b", cx: 14, cy: -6, rx: 7, ry: 10 },
    { id: "cut-c", cx: 0, cy: 18, rx: 4, ry: 7 },
  ],
};

export default recipe;
