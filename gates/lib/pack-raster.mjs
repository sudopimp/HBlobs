import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { here } from "./pack-paths.mjs";

const PY = process.env.PYTHON || "python3";
const SCRIPT = join(here, "pack-raster.py");

function run(args, opts = {}) {
  const r = spawnSync(PY, [SCRIPT, ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...opts,
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || `exit ${r.status}`).trim();
    throw new Error(err || `pack-raster ${args[0]} failed`);
  }
  return r;
}

export function decodeImage(path) {
  const dir = mkdtempSync(join(tmpdir(), "hblobs-rgba-"));
  const rawPath = join(dir, "px.rgba");
  try {
    const r = run(["decode", path, rawPath]);
    const meta = JSON.parse(r.stdout);
    return { w: meta.w, h: meta.h, rgba: readFileSync(rawPath) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function encodePng(rgba, w, h, dest) {
  const dir = mkdtempSync(join(tmpdir(), "hblobs-enc-"));
  const rawPath = join(dir, "px.rgba");
  try {
    writeFileSync(rawPath, rgba);
    run(["encode", rawPath, String(w), String(h), dest]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function synth(kind, dest) {
  run(["synth", kind, dest]);
  return dest;
}

export function synthTmp(kind, ext = ".png") {
  const dir = mkdtempSync(join(tmpdir(), "hblobs-synth-"));
  const dest = join(dir, `${kind}${ext}`);
  synth(kind, dest);
  return { dir, path: dest };
}
