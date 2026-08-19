#!/usr/bin/env node
/**
 * G-skill
 * file:    skills/blob/SKILL.md  (does not exist yet)
 * pass:    frontmatter name: blob; body references scripts/; locked hblobs verbs
 *          only; no live createdBy generator / ~/.codex/pets / pets install
 * twin:    name: hblobs  OR  no scripts/ reference
 * fail-pass: missing-skill | skill-wrong-name | skill-unlocked-verb | skill-forbidden
 * fail-twin: skill-wrong-name
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const twin = process.argv.includes("--twin");
const skillPath = resolve(root, "skills/blob/SKILL.md");

const LOCKED = new Set([
  "new",
  "color",
  "fatter",
  "thinner",
  "taller",
  "rounder",
  "add",
  "undo",
  "name",
  "export",
  "adopt",
  "show",
  "open",
  "make",
]);

function fail(token, extra) {
  console.error(extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`);
  process.exit(1);
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { fm, body: m[2] };
}

function slashName(name) {
  let cmd = String(name).toLowerCase().replace(/ /g, "-").replace(/_/g, "-");
  cmd = cmd.replace(/[^a-z0-9-]/g, "");
  cmd = cmd.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cmd ? `/${cmd}` : "";
}

function isDenial(line) {
  return /\b(do not|don't|does not|never|forbid|forbidden|omit|not |n't )\b/i.test(line);
}

function liveHits(body, re) {
  const hits = [];
  for (const line of body.split(/\r?\n/)) {
    if (re.test(line) && !isDenial(line)) hits.push(line.trim());
  }
  return hits;
}

function unlockedVerbs(body) {
  const bad = [];
  const re = /(?:\bhblobs\b|\/blob)\s+([a-z][\w-]*)/gi;
  let m;
  while ((m = re.exec(body))) {
    const verb = m[1].toLowerCase();
    if (!LOCKED.has(verb)) bad.push(verb);
  }
  return bad;
}

function judge(text) {
  const issues = [];
  const { fm, body } = parseFrontmatter(text);
  const name = fm.name || "";
  const slash = slashName(name || "blob");
  if (name !== "blob") issues.push("skill-wrong-name");
  if (slash !== "/blob") issues.push("skill-wrong-name");
  if (!/scripts\//.test(body)) issues.push("skill-wrong-name");
  if (!/\bhblobs\b/.test(body)) issues.push("skill-no-cli");
  const unlocked = unlockedVerbs(body);
  if (unlocked.length) issues.push("skill-unlocked-verb");
  if (liveHits(body, /createdBy\s*:\s*["']?generator/i).length) issues.push("skill-forbidden");
  if (liveHits(body, /~\/\.codex\/pets/).length) issues.push("skill-forbidden");
  if (liveHits(body, /hermes\s+pets\s+install/).length) issues.push("skill-forbidden");
  return { issues, name, slash, unlocked };
}

function scanSkillCommands(mdText) {
  const dir = join(tmpdir(), `hblobs-skill-scan-${process.pid}-${Date.now()}`);
  mkdirSync(join(dir, "blob"), { recursive: true });
  writeFileSync(join(dir, "blob", "SKILL.md"), mdText);
  const { fm } = parseFrontmatter(mdText);
  const name = fm.name || "blob";
  const key = slashName(name);
  rmSync(dir, { recursive: true, force: true });
  return { [key]: { name, skill_dir: join(dir, "blob") } };
}

const TWIN_WRONG_NAME = `---
name: hblobs
description: wrong slash
---

Call \`hblobs new\` via scripts/hblobs.mjs
`;

const TWIN_NO_SCRIPTS = `---
name: blob
description: prompt only
---

Make a blob by inventing a PNG. No pack writer.
`;

if (twin) {
  const a = judge(TWIN_WRONG_NAME);
  const b = judge(TWIN_NO_SCRIPTS);
  if (!a.issues.includes("skill-wrong-name")) fail("twin-accepted-wrong-name", a.slash);
  if (!b.issues.includes("skill-wrong-name")) fail("twin-accepted-no-scripts");
  fail("skill-wrong-name");
}

if (!existsSync(skillPath)) fail("missing-skill");

const text = readFileSync(skillPath, "utf8");
const judged = judge(text);
if (judged.issues.includes("skill-wrong-name")) fail("skill-wrong-name", `name=${judged.name} slash=${judged.slash}`);
if (judged.issues.includes("skill-no-cli")) fail("skill-no-cli");
if (judged.issues.includes("skill-unlocked-verb")) fail("skill-unlocked-verb", judged.unlocked.join(" "));
if (judged.issues.includes("skill-forbidden")) fail("skill-forbidden");

const scanned = scanSkillCommands(text);
if (!Object.prototype.hasOwnProperty.call(scanned, "/blob")) fail("skill-wrong-name", "scan_skill_commands missing /blob");

console.log(`measured  name=${judged.name} slash=/blob scripts=1`);
console.log("PASS hygiene-skill");
