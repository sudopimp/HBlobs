/** Known-bad: eye holes larger than the body ring. Twin for G-contain. */
import { circleRing } from "../lib/craft-util.mjs";

export function faceGeometry() {
  return {
    ring: circleRing(40, 64),
    eyes: [
      { cx: 0, cy: 0, rx: 80, ry: 80 },
      { cx: 0, cy: 0, rx: 80, ry: 80 },
    ],
    holes: [{ id: "poke", cx: 0, cy: 0, rx: 80, ry: 80 }],
  };
}
