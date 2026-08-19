#!/usr/bin/env node
/**
 * G-states
 * file:    src/engine/define-blob.js
 * pass:    sparse recipe still exposes the product catalog
 * twin:    gates/fixtures/states-idle-only.mjs
 * fail-pass: catalog-missing
 * fail-twin: catalog-missing
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

const impl = twin ? resolve(here, "fixtures/states-idle-only.mjs") : resolve(root, "src/engine/define-blob.js");
const { defineBlob } = await import(pathToFileURL(impl).href);

const api = defineBlob({
  body: [{ type: "circle", id: "a", x: 0, y: 0, r: 40 }],
  states: { idle: {} },
});

const need = ["idle", "thinking", "working", "listening", "sleeping", "celebrate", "failed"];
const missing = need.filter((s) => !api.STATES.includes(s));

if (twin) {
  if (missing.length === 0) fail("twin-had-catalog");
  fail("catalog-missing", missing.join(" "));
}

if (missing.length) fail("catalog-missing", missing.join(" "));

let thinking;
try {
  thinking = api.targetsFor("thinking");
} catch (e) {
  fail("catalog-missing", e?.message ?? e);
}
if (thinking?.overlay !== "dots") fail("catalog-missing", `thinking.overlay=${thinking?.overlay}`);

api.targetsFor("idle");

console.log(`measured  states=${api.STATES.length} thinking.overlay=${thinking.overlay}`);
console.log("PASS product-states");
