/**
 * Known-bad impl: `subtract`/`smax` is a no-op on the field; a `data-hole`
 * ellipse is recorded on the recipe. G-csg --twin must reject this with
 * FAIL painted-hole-not-sdf.
 */
import { circleRing } from "../lib/sota-metrics.mjs";

const BODY_R = 50;

export function defineBlob(recipe) {
  if (!recipe || !Array.isArray(recipe.body) || recipe.body.length === 0) {
    throw new Error("recipe body is required");
  }
  const holes = [];
  for (const op of recipe.body) {
    if (op.type === "subtract" || op.type === "smax") {
      const cut = recipe.body.find((o) => o.id === op.b);
      if (cut && Number.isFinite(cut.r)) {
        holes.push({ id: "painted", cx: cut.x ?? 0, cy: cut.y ?? 0, rx: cut.r, ry: cut.r });
      } else {
        holes.push({ id: "painted", cx: 0, cy: 0, rx: 18, ry: 18 });
      }
    }
  }
  const sdf = (px, py) => Math.hypot(px, py) - BODY_R;
  return {
    recipe: { ...recipe, holes },
    sdf,
    silhouette() {
      return circleRing(0, 0, BODY_R, 128);
    },
    faceGeometry() {
      return { holes, ring: circleRing(0, 0, BODY_R, 128) };
    },
  };
}
