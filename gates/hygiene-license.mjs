#!/usr/bin/env node
/**
 * G-license
 * file:    LICENSE (present); product tree must stay free of the grok+bot product name
 * pass:    whole-tree text scan (not three files) has no /grok + bot/i;
 *          LICENSE contains MIT and 2026; package.json license is MIT
 * twin:    gates/fixtures/grok-bot-copy.md
 * fail-pass: grok-bot-string | license-not-mit | license-not-2026 | package-license
 * fail-twin: grok-bot-string
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const fixture = resolve(here, "fixtures/grok-bot-copy.md");

const SKIP_DIRS = new Set([".git", "node_modules", "gates", "evidence"]);
const SKIP_EXT = new Set([
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".gif",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".ico",
  ".pdf",
  ".zip",
]);

// Split so this file never contains the forbidden product name as one token.
const FORBIDDEN = new RegExp(`grok${" "}bot`, "i");

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function walkText(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkText(p, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

function scanText(text) {
  return FORBIDDEN.test(text);
}

if (twin) {
  if (!existsSync(fixture)) fail("missing-twin-fixture");
  const text = readFileSync(fixture, "utf8");
  if (scanText(text)) fail("grok-bot-string", relative(root, fixture));
  fail("twin-clean");
}

const licensePath = resolve(root, "LICENSE");
const pkgPath = resolve(root, "package.json");
if (!existsSync(licensePath)) fail("license-not-mit", "LICENSE missing");
const license = readFileSync(licensePath, "utf8");
if (!/MIT/i.test(license)) fail("license-not-mit");
if (!/2026/.test(license)) fail("license-not-2026");

if (!existsSync(pkgPath)) fail("package-license", "package.json missing");
let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch (e) {
  fail("package-license", e?.message ?? e);
}
if (pkg.license !== "MIT") fail("package-license", JSON.stringify(pkg.license));

const hits = [];
for (const file of walkText(root)) {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  if (SKIP_EXT.has(ext)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (scanText(text)) hits.push(relative(root, file));
}
if (hits.length) fail("grok-bot-string", hits.join(" "));

console.log("measured  license=MIT year=2026 package=MIT grok-bot-hits=0");
console.log("PASS hygiene-license");
