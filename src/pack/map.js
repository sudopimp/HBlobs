import { ALIAS, CODEX_ROWS } from "./const.js";

export function mapActivity(name) {
  const rowName = ALIAS[name] ?? name;
  const row = CODEX_ROWS.indexOf(rowName);
  if (row < 0) throw new Error(`unknown activity ${name}`);
  return row;
}

export default mapActivity;
