/** Known-bad third RAF/_tick barrel. Twin for G-one-tick. */
export function startExtraTick() {
  const _tick = () => {
    requestAnimationFrame(_tick);
  };
  requestAnimationFrame(_tick);
}
