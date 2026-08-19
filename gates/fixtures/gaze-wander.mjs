/** Known-bad: idle gaze retargets ±4 / ±3. Twin for G-gaze-held. */
export function idleGazeTarget(pose, rndX = 1, rndY = 1) {
  return {
    x: pose.gazeX + (rndX * 2 - 1) * 4,
    y: pose.gazeY + (rndY * 2 - 1) * 3,
  };
}
