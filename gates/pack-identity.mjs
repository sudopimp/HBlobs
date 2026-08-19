#!/usr/bin/env node
/**
 * G-identity
 * file:    dist/pack/spritesheet.webp  (does not exist yet)
 * pass:    IoU(idle, run) in-band from ATLAS PIXELS; reject pure rotate/translate/scale
 * twin:    nine idle copies + lab rotate pair
 * fail-pass: missing-atlas | identity-copy | identity-rigid | identity-swap
 * fail-twin: nine-idle-copies | lab-rotate-pair
 */
import { fail, failAll } from "./lib/pack-fail.mjs";
import { findPackDir, findSheet } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";
import {
  COPY_IOU,
  SAME_CHAR_IOU_MIN,
  extractCell,
  iouImages,
  isPureRigid,
} from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");

function idleRun(img) {
  const idle = extractCell(img, 0, 0);
  const run = extractCell(img, 0, 7);
  return { idle, run, iou: idle && run ? iouImages(idle, run) : 0 };
}

if (twin) {
  const tokens = [];
  const nine = decodeImage(synthTmp("nine-idle").path);
  const { iou, idle, run } = idleRun(nine);
  if (iou >= COPY_IOU) tokens.push({ token: "nine-idle-copies", extra: `iou=${iou.toFixed(3)}` });
  else tokens.push({ token: "twin-not-nine-idle", extra: `iou=${iou.toFixed(3)}` });

  const a = decodeImage(synthTmp("lab-rotate-a").path);
  const b = decodeImage(synthTmp("lab-rotate-b").path);
  const pairIou = iouImages(a, b);
  if (isPureRigid(a, b)) tokens.push({ token: "lab-rotate-pair", extra: `iou=${pairIou.toFixed(3)}` });
  else tokens.push({ token: "twin-not-lab-rotate", extra: `iou=${pairIou.toFixed(3)}` });

  void idle;
  void run;
  failAll(tokens);
}

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const img = decodeImage(sheet);
const { idle, run, iou } = idleRun(img);
if (!idle || !run) fail("missing-atlas", "idle/run cell");
if (iou >= COPY_IOU) fail("identity-copy", `iou=${iou.toFixed(3)}`);
if (iou < SAME_CHAR_IOU_MIN) fail("identity-swap", `iou=${iou.toFixed(3)}`);
if (isPureRigid(idle, run)) fail("identity-rigid", `iou=${iou.toFixed(3)}`);
console.log(`measured  idle-run-iou=${iou.toFixed(3)}`);
console.log("PASS pack-identity");
