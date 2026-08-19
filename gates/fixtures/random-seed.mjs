/**
 * Known-bad impl: dice ignores the seed and uses Math.random.
 * G-seed --twin must reject this with FAIL seed-nondeterministic.
 */

let roll = 0;

export function recipeFromSeed(seed) {
  void seed;
  roll += 1;
  return {
    schemaVersion: 0,
    tag: "rand-dice",
    fill: "#5ad4c8",
    body: [
      {
        type: "circle",
        id: "mass",
        x: Math.random() * 8,
        y: Math.random() * 8,
        r: 24 + roll + Math.random() * 40,
      },
    ],
    states: { idle: {} },
  };
}

export const fromSeed = recipeFromSeed;
export const dice = recipeFromSeed;
export default recipeFromSeed;
