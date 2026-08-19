/** Twin: sparse recipe does not merge a catalog. */
export function defineBlob(recipe) {
  const states = recipe?.states ?? { idle: {} };
  return {
    STATES: Object.keys(states),
    targetsFor(state) {
      if (!states[state]) throw new Error(`unknown state: ${state}`);
      return { overlay: "none" };
    },
  };
}
