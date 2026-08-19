/**
 * Known-bad impl: the prompt string is eval()'d (KuroBlob-shaped hole).
 * G-nl --twin must reject this with FAIL nl-evals-prompt.
 */

export function applyLook(recipe, token) {
  eval(token);
  return recipe;
}

export const applyAdjective = applyLook;
export default applyLook;
