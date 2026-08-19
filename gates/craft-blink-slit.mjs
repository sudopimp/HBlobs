#!/usr/bin/env node
/**
 * G-blink-slit: lid mid-hold ≤ 0.045 applied as openY only (width unchanged).
 * PASS observes product: blinkLid, blinkOpenY(lid, eyeScale), define-blob
 * openY wiring (no scale*lid), and eyeEllipse rx lock at the slit.
 * Twin: circle-shrink (rx and ry both * lid).
 *
 * fail-pass: hold-openY | circle-shrink
 * fail-twin: circle-shrink
 *
 * hold-openY also fires when define-blob still multiplies lid by eyeScale /
 * pose.eyeScale / eyeOpen.x (today: s.eyeOpen.x * lid).
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
const src = read(resolve(root, "src/engine/define-blob.js"));
const defaults = parsePoseDefaults(src);
const mid = blink.BLINK_CLOSE + blink.BLINK_HOLD / 2;
const lid = blink.blinkLid(mid, false);
const eyeScale = defaults?.eyeScale ?? 1.28;
const holdY = blink.blinkOpenY(lid, eyeScale);
const size = eyeWidthScale(eyeScale);
const open = eyeEllipse(-1, eyeScale, size, 0, 0, 1);
const hold = eyeEllipse(-1, holdY, size, 0, 0, 1);
const multiplies =
  /(?:pose\.)?eyeScale\s*\*\s*lid/.test(src) || /eyeOpen\.x\s*\*\s*lid/.test(src);

console.log(`measured  lid=${lid} holdOpenY=${holdY} rxOpen=${open.rx} rxHold=${hold.rx} eyeScale=${eyeScale}`);

if (lid == null || lid > 0.045) fail("hold-openY", `lid=${lid}`);
if (holdY == null || holdY > 0.045) fail("hold-openY", `openY=${holdY}`);
if (multiplies) fail("hold-openY", "define-blob multiplies scale*lid into openY");
if (Math.abs(hold.rx - open.rx) > 1e-6) fail("circle-shrink", `rx changed ${open.rx} → ${hold.rx}`);

console.log("PASS craft-blink-slit");
