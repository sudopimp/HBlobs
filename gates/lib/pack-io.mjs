import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { HERMES_AGENT_ROOT, here } from "./pack-paths.mjs";
import { synth } from "./pack-raster.mjs";

const PY = process.env.PYTHON || "python3";
const UNICODE = join(here, "pet-unicode.py");
const PETDEX_JSON = join(dirname(here), "fixtures/petdex-copy/pet.json");

export function petUnicode(sheet, state, index = 0) {
  const r = spawnSync(PY, [UNICODE, "unicode", sheet, state, String(index)], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, HERMES_AGENT_ROOT },
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "unicode fail").trim());
  }
  return r.stdout;
}

export function adoptHash(exportDir, slug) {
  const home = mkdtempSync(join(tmpdir(), "hblobs-hermes-"));
  const r = spawnSync(PY, [UNICODE, "adopt-hash", exportDir, slug], {
    encoding: "utf8",
    env: { ...process.env, HERMES_AGENT_ROOT, HERMES_HOME: home },
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "adopt-hash fail").trim());
  }
  return JSON.parse(r.stdout);
}

export function isPetdexCopy(meta, dir) {
  if (!meta || typeof meta !== "object") return false;
  if (meta.submittedBy || meta.spritesheetUrl || meta.zipUrl) return true;
  if (meta.kind === "creature" && !existsSync(join(dir, "recipe.json"))) return true;
  return false;
}

export function stripHeader(text) {
  const lines = String(text).split(/\r?\n/);
  while (lines.length && (!lines[0].trim() || /mode=|Ctrl\+C|—/.test(lines[0]))) {
    lines.shift();
  }
  return lines.join("\n");
}

export function makePetdexTwin() {
  const dir = mkdtempSync(join(tmpdir(), "hblobs-petdex-"));
  writeFileSync(join(dir, "pet.json"), readFileSync(PETDEX_JSON));
  synth("idle-cell", join(dir, "spritesheet.webp"));
  return dir;
}

export function makePng512Pack() {
  const dir = mkdtempSync(join(tmpdir(), "hblobs-png512-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "pet.json"),
    JSON.stringify({
      id: "png512-twin",
      displayName: "png512",
      spritesheetPath: "spritesheet.png",
    }),
  );
  synth("png512", join(dir, "spritesheet.png"));
  return dir;
}
