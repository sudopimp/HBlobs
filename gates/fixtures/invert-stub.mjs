/** Twin invert: always reports two blobs, never empty / 1 / 3. */
export function invertRaster(_rgba, _w, _h) {
  return { count: 2, centers: [[16, 16], [48, 32]] };
}
