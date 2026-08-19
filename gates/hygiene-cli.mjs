#!/usr/bin/env node
/**
 * G-cli
 * file:    bin/hblobs.mjs  (does not exist yet)
 * pass:    new | color | fatter | export | adopt are routed; adopt does not
 *          spawn hermes pets install
 * twin:    adopt that calls hermes pets install
 * fail-pass: missing-cli | cli-verbs | adopt-uses-gallery-install
 * fail-twin: adopt-uses-gallery-install
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const cliPath = resolve(root, "bin/hblobs.mjs");
const VERBS = ["new", "color", "fatter", "export", "adopt"];
const GALLERY_SHELL = /hermes\s+pets\s+install/;
const GALLERY_ARGV = /["'`]hermes["'`]\s*,\s*(?:\[\s*)?["'`]pets["'`]\s*,\s*["'`]install["'`]/;

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function isDenial(line) {
  return /\b(do not|don't|does not|never|forbid|forbidden|omit|not |n't |throw|error)\b/i.test(line);
}

function lineCallsGallery(ln) {
  return GALLERY_SHELL.test(ln) || GALLERY_ARGV.test(ln);
}

function adoptUsesGallery(src) {
  const code = stripComments(src);
  if (!/\badopt\b/.test(code)) return false;
  if (GALLERY_SHELL.test(code) || GALLERY_ARGV.test(code)) {
    const live = code.split(/\r?\n/).filter((ln) => lineCallsGallery(ln) && !isDenial(ln));
    return live.length > 0;
  }
  return false;
}

function routedVerbs(src) {
  const code = stripComments(src);
  return VERBS.filter((v) => {
    const re = new RegExp(
      String.raw`["'\`]${v}["'\`]|case\s+["']${v}["']|===?\s*["']${v}["']|\b${v}\b\s*[:)]`,
    );
    return re.test(code);
  });
}

const TWIN_ADOPT = `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const cmd = process.argv[2];
const verbs = ["new", "color", "fatter", "export", "adopt"];
if (!verbs.includes(cmd)) process.exit(2);
if (cmd === "adopt") {
  spawnSync("hermes", ["pets", "install", process.argv[3] || "demo-slug"], { stdio: "inherit" });
}
`;

if (twin) {
  const dir = join(tmpdir(), `hblobs-cli-twin-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const twinFile = join(dir, "hblobs.mjs");
  writeFileSync(twinFile, TWIN_ADOPT);
  const src = readFileSync(twinFile, "utf8");
  rmSync(dir, { recursive: true, force: true });
  if (!adoptUsesGallery(src)) fail("twin-adopt-clean");
  fail("adopt-uses-gallery-install");
}

if (!existsSync(cliPath)) fail("missing-cli");

const src = readFileSync(cliPath, "utf8");
const routed = routedVerbs(src);
const missing = VERBS.filter((v) => !routed.includes(v));
if (missing.length) fail("cli-verbs", missing.join(" "));
if (adoptUsesGallery(src)) fail("adopt-uses-gallery-install");

console.log(`measured  verbs=${routed.join(",")} adopt-gallery=0`);
console.log("PASS hygiene-cli");
