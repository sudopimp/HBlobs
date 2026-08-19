#!/usr/bin/env node
/**
 * Hash lock for gates/ bytes.
 * pass:    evidence/gates.lock matches sha256 of every file under gates/
 * twin:    a mutated lock must be rejected
 * fail-pass: missing-lock | hash-mismatch
 * fail-twin: hash-mismatch
 *
 * Conductor pin: node gates/hash-lock.mjs --write
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const gatesRoot = resolve(root, "gates");
const lockPath = resolve(root, "evidence/gates.lock");
const twin = process.argv.includes("--twin");
const write = process.argv.includes("--write");

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

function manifest() {
  const files = walk(gatesRoot)
    .map((p) => relative(root, p).replaceAll("\\", "/"))
    .sort();
  const out = {};
  for (const rel of files) {
    const bytes = readFileSync(resolve(root, rel));
    out[rel] = createHash("sha256").update(bytes).digest("hex");
  }
  return out;
}

function same(a, b) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    if (a[ka[i]] !== b[kb[i]]) return false;
  }
  return true;
}

function loadLock(raw) {
  const parsed = JSON.parse(raw);
  if (parsed && parsed.files && typeof parsed.files === "object") return parsed.files;
  if (parsed && typeof parsed === "object") return parsed;
  return {};
}

const actual = manifest();

if (twin) {
  const keys = Object.keys(actual);
  if (!keys.length) fail("hash-empty");
  const mutated = { ...actual, [keys[0]]: "0".repeat(64) };
  if (same(mutated, actual)) fail("twin-identical");
  fail("hash-mismatch", keys[0]);
}

if (write) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const body = `${JSON.stringify({ algo: "sha256", files: actual }, null, 2)}\n`;
  writeFileSync(lockPath, body);
  console.log(`measured  wrote=${Object.keys(actual).length} path=evidence/gates.lock`);
  console.log("PASS hash-lock-write");
  process.exit(0);
}

if (!existsSync(lockPath)) fail("missing-lock");

let expected;
try {
  expected = loadLock(readFileSync(lockPath, "utf8"));
} catch (e) {
  fail("hash-mismatch", e?.message ?? e);
}

if (!same(expected, actual)) {
  const extra = [];
  for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (expected[k] !== actual[k]) extra.push(k);
  }
  fail("hash-mismatch", extra.join(" "));
}

console.log(`measured  files=${Object.keys(actual).length}`);
console.log("PASS hash-lock");
