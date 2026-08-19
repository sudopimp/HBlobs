/** Twin: pack defaults still force candy. */
export function ensurePackRecipe(recipe) {
  const next = JSON.parse(JSON.stringify(recipe ?? {}));
  next.finish = next.finish || "gummy";
  next.skin = next.skin || "gummy";
  if (!Array.isArray(next.body) || next.body.length === 0) {
    next.body = [{ type: "circle", id: "a", x: 0, y: 0, r: 40 }];
  }
  return next;
}
