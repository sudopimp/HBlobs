#!/usr/bin/env node
/**
 * G-motion
 * file:    dist/pack/spritesheet.webp  (does not exist yet)
 * pass:    running frame 0 vs 3: centroid travel in band AND IoU in (0.70, 0.98)
 *          atlas pixels only — no path-hash
 * twin:    2px nudge
 * fail-pass: missing-atlas | motion-static | motion-nudge | motion-iou
 * fail-twin: nudge-2px
 */
import { fail } from "./lib/pack-fail.mjs";
import { findPackDir, findSheet } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";
import { MOTION_IOU, MOTION_TRAVEL, centroid, extractCell, iouImages } from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");

function runningPair(img) {
  const a = extractCell(img, 0, 7);
  const b = extractCell(img, 3, 7);
  if (!a || !b) return null;
  const ca = centroid(a);
  const cb = centroid(b);
  const travel = Math.hypot(cb.x - ca.x, cb.y - ca.y);
  const iou = iouImages(a, b);
  return { travel, iou, ca, cb };
}

function motionToken(m) {
  if (!m) return "missing-atlas";
  if (m.travel < 1 && m.iou >= 0.98) return "motion-static";
  if (m.travel <= 2.5 && m.iou >= 0.9) return "nudge-2px";
  if (m.travel < MOTION_TRAVEL[0]) return "motion-static";
  if (m.travel > MOTION_TRAVEL[1]) return "motion-travel";
  if (m.iou <= MOTION_IOU[0] || m.iou >= MOTION_IOU[1]) return "motion-iou";
  return null;
}

if (twin) {
  const img = decodeImage(synthTmp("nudge-2px").path);
  const m = runningPair(img);
  const tok = motionToken(m);
  if (tok === "nudge-2px") fail("nudge-2px", `travel=${m.travel.toFixed(2)} iou=${m.iou.toFixed(3)}`);
  fail("twin-not-nudge", `travel=${m?.travel} iou=${m?.iou} tok=${tok}`);
}

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const m = runningPair(decodeImage(sheet));
const tok = motionToken(m);
if (tok) fail(tok, `travel=${m?.travel?.toFixed?.(2)} iou=${m?.iou?.toFixed?.(3)}`);
console.log(`measured  travel=${m.travel.toFixed(2)} iou=${m.iou.toFixed(3)}`);
console.log("PASS pack-motion");
