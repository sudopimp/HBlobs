#!/usr/bin/env node
/**
 * G-blink-slit: lid mid-hold ≤ 0.045 applied as openY only (width unchanged).
 * PASS reads blinkLid + how defineBlob multiplies idle eyeScale * lid.
 * Twin: circle-shrink (rx and ry both * lid).
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail, isTwin, parsePoseDefaults, read, root } from "./lib/craft-util.mjs";

const twin = isTwin();

if (twin) {
  const shrink = await import(pathToFileURL(resolve(root, "gates/fixtures/circle-shrink-blink.mjs")).href);
  const open = { rx: 13.7, ry: 28.2 };
  const lid = shrink.blinkLid();
  const closed = shrink.blinkEye(open.rx, open.ry, lid);
  if (Math.abs(closed.rx - open.rx) > 1e-6) fail("circle-shrink", `rx ${open.rx} → ${closed.rx}`);
  fail("circle-shrink", "twin did not shrink rx");
}

const blink = await import(pathToFileURL(resolve(root, "src/engine/blink.js")).href);
const { eyeEllipse, eyeWidthScale } = await import(pathToFileURL(resolve(root, "src/engine/face.js")).href);
const defaults = parsePoseDefaults(read(resolve(root, "src/engine/define-blob.js")));
const mid = blink.BLINK_CLOSE + blink.BLINK_HOLD / 2;
const lid = blink.blinkLid(mid, false);
const eyeScale = defaults?.eyeScale ?? 1.28;
const size = eyeWidthScale(eyeScale);
const open = eyeEllipse(-1, eyeScale, size, 0, 0, 1);
const holdY = eyeScale * lid;
const hold = eyeEllipse(-1, holdY, size, 0, 0, 1);

console.log(`measured  lid=${lid} holdOpenY=${holdY} rxOpen=${open.rx} rxHold=${hold.rx}`);

if (lid == null || lid > 0.045) fail("hold-openY", `lid=${lid}`);
if (Math.abs(hold.rx - open.rx) > 1e-6) fail("circle-shrink", `rx changed ${open.rx} → ${hold.rx}`);
if (holdY > 0.045) fail("hold-openY", `openY=${holdY} > 0.045 (eyeScale*lid)`);

console.log("PASS craft-blink-slit");
