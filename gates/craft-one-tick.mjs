#!/usr/bin/env node
/**
 * G-one-tick: exactly one RAF/_tick barrel under src/ + playground/.
 * PASS fails today: defineBlob _tick + lab.html paint.
 * Twin: extra third tick file must be rejected.
 */
import { resolve } from "node:path";
import {
  fail,
  isTwin,
  read,
  root,
  tickBarrelsIn,
  walkSrcPlayground,
} from "./lib/craft-util.mjs";

const twin = isTwin();
const files = walkSrcPlayground();
if (twin) files.push(resolve(root, "gates/fixtures/third-tick.mjs"));

const barrels = [];
for (const file of files) {
  barrels.push(...tickBarrelsIn(read(file), file));
}

console.log(
  `measured  barrels=${barrels.length} ${barrels.map((b) => `${b.kind}:${b.file.slice(root.length + 1)}`).join(" ")}`,
);

if (twin) {
  if (barrels.length >= 3) fail("third-tick", `count=${barrels.length}`);
  fail("third-tick", "fixture did not add a third barrel");
}

if (barrels.length !== 1) fail("two-tick", `count=${barrels.length}`);

console.log("PASS craft-one-tick");
