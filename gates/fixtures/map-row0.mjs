/** Twin: every Hermes activity name maps to row 0. */
const KNOWN = new Set([
  "idle",
  "wave",
  "run",
  "failed",
  "review",
  "jump",
  "waiting",
  "running-right",
  "running-left",
]);

export function mapActivity(name) {
  if (!KNOWN.has(name)) throw new Error(`unknown activity ${name}`);
  return 0;
}
