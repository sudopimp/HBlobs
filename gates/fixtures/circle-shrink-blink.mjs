/** Known-bad: blink scales both axes. Twin for G-blink-slit. */
export const BLINK_SLIT = 0.2;

export function blinkLid() {
  return BLINK_SLIT;
}

export function blinkEye(rx, ry, lid) {
  return { rx: rx * lid, ry: ry * lid };
}
