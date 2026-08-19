#!/usr/bin/env node
/**
 * G-preview-eq-cell
 * file:    dist/pack/preview-idle.png  (does not exist yet)
 * pass:    paused maker snapshot vs atlas idle cell IoU ≥ 0.97
 * twin:    512 PNG (lab screenshot stand-in)
 * fail-pass: missing-atlas | missing-preview | preview-iou
 * fail-twin: preview-512
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fail } from "./lib/pack-fail.mjs";
import { PREVIEW_FILE, findPackDir, findSheet, root } from "./lib/pack-paths.mjs";
import { decodeImage, synthTmp } from "./lib/pack-raster.mjs";
import { PREVIEW_IOU, extractCell, iouImages } from "./lib/pack-atlas.mjs";

const twin = process.argv.includes("--twin");

if (twin) {
  const preview = decodeImage(synthTmp("preview-512").path);
  const idle = decodeImage(synthTmp("idle-cell").path);
  if (preview.w === 512 && preview.h === 512) {
    fail("preview-512", `iou=${iouImages(preview, idle).toFixed(3)}`);
  }
  fail("twin-not-512", `${preview.w}x${preview.h}`);
}

const pack = findPackDir();
const sheet = findSheet(pack);
if (!sheet) fail("missing-atlas");
const previewPath = resolve(root, PREVIEW_FILE);
if (!existsSync(previewPath)) fail("missing-preview");
const preview = decodeImage(previewPath);
if (preview.w === 512 && preview.h === 512) fail("preview-512");
const idle = extractCell(decodeImage(sheet), 0, 0);
if (!idle) fail("missing-atlas", "idle cell");
if (preview.w !== idle.w || preview.h !== idle.h) fail("preview-size", `${preview.w}x${preview.h}`);
const iou = iouImages(preview, idle);
if (iou < PREVIEW_IOU) fail("preview-iou", `iou=${iou.toFixed(3)}`);
console.log(`measured  preview-idle-iou=${iou.toFixed(3)}`);
console.log("PASS pack-preview");
