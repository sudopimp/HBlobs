export function blinkEaseIn(u) {
  return u * u * u;
}

export function blinkEaseOut(u) {
  return 1 - (1 - u) ** 3;
}

export const BLINK_SLIT = 0.045;
export const BLINK_CLOSE = 55;
export const BLINK_HOLD = 48;
export const BLINK_OPEN = 78;
export const BLINK_GAP = 42;
export const BLINK_ONE = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;

/** Lid multiplier: 1 = open, ~0.045 = closed line. null = sequence finished. */
export function blinkLid(bt, double) {
  const phase = (t) => {
    if (t < BLINK_CLOSE) return 1 - (1 - BLINK_SLIT) * blinkEaseIn(t / BLINK_CLOSE);
    if (t < BLINK_CLOSE + BLINK_HOLD) return BLINK_SLIT;
    if (t < BLINK_ONE) {
      return BLINK_SLIT + (1 - BLINK_SLIT) * blinkEaseOut((t - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN);
    }
    return null;
  };
  const first = phase(bt);
  if (first !== null) return first;
  if (!double) return null;
  const second = bt - BLINK_ONE - BLINK_GAP;
  if (second < 0) return 1;
  return phase(second);
}
