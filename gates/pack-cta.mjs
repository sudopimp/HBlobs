#!/usr/bin/env node
/**
 * G-cta
 * file:    playground/lab.html  (visible primary button must write a pack)
 * pass:    click the visible CTA; {pet.json, spritesheet.webp} exist; no lone PNG
 * twin:    renamed button that still writes 512 PNG
 * fail-pass: cta-png
 * fail-twin: cta-rename-png
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail } from "./lib/pack-fail.mjs";
import { LAB_HTML, LAB_MJS, findPackDir, root, webpPath } from "./lib/pack-paths.mjs";
import { readCta } from "./lib/pack-cta.mjs";

const twin = process.argv.includes("--twin");
const htmlPath = twin ? resolve(root, "gates/fixtures/cta-rename.html") : resolve(root, LAB_HTML);

if (!existsSync(htmlPath)) fail("missing-lab-html");
const cta = readCta(htmlPath);

if (twin) {
  const renamed = !/png|descargar/i.test(cta.label);
  if (renamed && cta.writesPng && !cta.writesPack) fail("cta-rename-png", `label=${cta.label}`);
  fail("twin-not-rename-png", `label=${cta.label} png=${cta.writesPng} pack=${cta.writesPack}`);
}

if (cta.writesPng && !cta.writesPack) fail("cta-png", `label=${cta.label}`);
if (cta.pngNamed) fail("cta-png", `label=${cta.label}`);

const labMjs = resolve(root, LAB_MJS);
if (existsSync(labMjs)) {
  const mod = await import(pathToFileURL(labMjs).href);
  if (typeof mod.exportPack === "function") {
    const out = findPackDir() ?? resolve(root, "dist/pack");
    await mod.exportPack(out);
  }
}

const pack = findPackDir();
if (!pack) fail("cta-png", "no pack dir");
if (!existsSync(join(pack, "pet.json")) || !existsSync(webpPath(pack))) {
  fail("cta-png", "missing pet.json or spritesheet.webp");
}
if (existsSync(join(pack, "blob.png")) && !existsSync(webpPath(pack))) fail("cta-png", "lone png");

console.log(`measured  cta=${cta.label}`);
console.log("PASS pack-cta");
