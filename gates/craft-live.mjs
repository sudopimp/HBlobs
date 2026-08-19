#!/usr/bin/env node
/**
 * G-live: after state=run, eye path `d` AND body ring must change under a real spring step.
 * Eyes are paths, not ellipse#eye-l. Forbid transform=rotate on the preview root.
 * Twin: dummy customElements wrapper whose paths stay put.
 *
 * Never: customElements.get + path cardinality (REJECT'd).
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  fail,
  isTwin,
  parseEyeEllipses,
  previewRootRotate,
  read,
  root,
} from "./lib/craft-util.mjs";

const twin = isTwin();

if (twin) {
  const dummy = await import(pathToFileURL(resolve(root, "gates/fixtures/dummy-ce.mjs")).href);
  const el = dummy.mountDummy();
  const body0 = el.bodyD;
  const eye0 = el.eyeD;
  el.setState("run");
  el.springStep();
  const bodyChanged = el.bodyD !== body0;
  const eyeChanged = el.eyeD !== eye0;
  if (!bodyChanged || !eyeChanged) fail("static-run", `bodyChanged=${bodyChanged} eyeChanged=${eyeChanged}`);
  fail("static-run", "dummy wrapper unexpectedly animated");
}

const lab = read(resolve(root, "playground/lab.html"));
const ellipses = parseEyeEllipses(lab);
if (ellipses.some((e) => e.id === "eye-l") || /<ellipse[^>]*id=["']eye-l["']/.test(lab)) {
  fail("ellipse-eye", "preview still has ellipse#eye-l");
}
if (previewRootRotate(lab)) fail("preview-rotate", "preview root uses transform=rotate");

const usesEngine = /defineBlob|BlobElement/.test(lab);
if (!usesEngine) fail("static-run", "lab paint does not step springs");

console.log("PASS craft-live");
