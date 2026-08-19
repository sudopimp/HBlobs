#!/usr/bin/env node
/**
 * G-consume
 * file:    dist/pack/spritesheet.webp  (does not exist yet)
 * pass:    temp HERMES_HOME + PetRenderer mode=unicode; header strip;
 *          idle and run contain ▀ and differ; hash exported webp;
 *          load_pet path hash equals export
 * twin:    petdex-copy pack + 512 spritesheet.png
 *          hermes pets install is NOT a twin
 * fail-pass: missing-pack
 * fail-twin: petdex-copy | spritesheet-png-512
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fail, failAll } from "./lib/pack-fail.mjs";
import { findPackDir, findSheet, webpPath } from "./lib/pack-paths.mjs";
import { decodeImage } from "./lib/pack-raster.mjs";
import { adoptHash, isPetdexCopy, makePetdexTwin, makePng512Pack, petUnicode, stripHeader } from "./lib/pack-io.mjs";

const twin = process.argv.includes("--twin");
const BLOCK = "▀";

function consumeTokens(dir) {
  const tokens = [];
  const metaPath = join(dir, "pet.json");
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : null;
  if (isPetdexCopy(meta, dir)) tokens.push("petdex-copy");

  const sheet = findSheet(dir);
  if (!sheet) {
    tokens.push("missing-pack");
    return tokens;
  }
  if (basename(sheet) === "spritesheet.png") {
    const img = decodeImage(sheet);
    if (img.w === 512 && img.h === 512) tokens.push("spritesheet-png-512");
  }
  if (tokens.includes("petdex-copy") || tokens.includes("spritesheet-png-512")) return tokens;
  const webp = webpPath(dir);
  if (!existsSync(webp)) {
    tokens.push("missing-pack");
    return tokens;
  }

  const hash = createHash("sha256").update(readFileSync(webp)).digest("hex");
  const slug = String(meta?.id || "hblob");
  const adopted = adoptHash(dir, slug);
  if (!adopted.match) tokens.push("hash-mismatch");

  const idle = stripHeader(petUnicode(sheet, "idle", 0));
  const run = stripHeader(petUnicode(sheet, "run", 0));
  if (!idle.includes(BLOCK) || !run.includes(BLOCK)) tokens.push("empty-unicode");
  if (idle === run) tokens.push("idle-eq-run");
  void hash;
  return tokens;
}

if (twin) {
  const tokens = [];
  const petdex = consumeTokens(makePetdexTwin());
  if (petdex.includes("petdex-copy")) tokens.push("petdex-copy");
  else tokens.push("twin-not-petdex-copy");

  const png = consumeTokens(makePng512Pack());
  if (png.includes("spritesheet-png-512")) tokens.push("spritesheet-png-512");
  else tokens.push("twin-not-512");

  failAll(tokens);
}

const pack = findPackDir();
if (!pack) fail("missing-pack");
const webp = webpPath(pack);
if (!existsSync(webp)) fail("missing-pack");
const tokens = consumeTokens(pack);
if (tokens.includes("petdex-copy")) fail("petdex-copy");
if (tokens.includes("spritesheet-png-512")) fail("spritesheet-png-512");
if (tokens.includes("missing-pack")) fail("missing-pack");
if (tokens.includes("hash-mismatch")) fail("hash-mismatch");
if (tokens.includes("empty-unicode")) fail("empty-unicode");
if (tokens.includes("idle-eq-run")) fail("idle-eq-run");

const hash = createHash("sha256").update(readFileSync(webp)).digest("hex");
console.log(`measured  webp-sha256=${hash}`);
console.log("PASS pack-consume");
