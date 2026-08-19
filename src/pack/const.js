/** Codex atlas geometry. Duplicated here so pack code does not import gates. */

export const CELL_W = 192;
export const CELL_H = 208;
export const COLS = 8;
export const ROWS = 9;

export const CODEX_ROWS = [
  "idle",
  "running-right",
  "running-left",
  "waving",
  "jumping",
  "failed",
  "waiting",
  "running",
  "review",
];

export const FRAME_COUNTS = {
  idle: 6,
  "running-right": 8,
  "running-left": 8,
  waving: 4,
  jumping: 5,
  failed: 8,
  waiting: 6,
  running: 6,
  review: 6,
};

export const ALIAS = { wave: "waving", jump: "jumping", run: "running" };

export const DEFAULT_FILL = "#ff5ec8";
export const HOLE = "#121214";
