#!/usr/bin/env node
/**
 * Thin wrapper around this checkout's CLI.
 * Skill install copies only referenced scripts/ — set HBLOBS_ROOT or keep
 * the repo on disk. Node must be on PATH.
 * Do not run hermes pets install (gallery-only).
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOCKED = [
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
];

function fail(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function walkRepo(start) {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "bin", "hblobs.mjs"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function findRepo() {
  const env = process.env.HBLOBS_ROOT;
  if (env && existsSync(join(env, "bin", "hblobs.mjs"))) return env;
  return walkRepo(dirname(fileURLToPath(import.meta.url))) || walkRepo(process.cwd());
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error) fail(`${cmd}: ${r.error.message}`, 1);
  return r.status ?? 1;
}

function packSlug(repo, args) {
  if (args[0] && !args[0].startsWith("-")) return args[0];
  const meta = join(repo, "dist", "pack", "pet.json");
  if (existsSync(meta)) {
    try {
      const id = JSON.parse(readFileSync(meta, "utf8")).id;
      if (id) return String(id);
    } catch {
      /* fall through */
    }
  }
  return "hblob";
}

function cli(repo, argv) {
  return run(process.execPath, [join(repo, "bin", "hblobs.mjs"), ...argv]);
}

function cmdShow(args) {
  if (args.length) return run("hermes", ["pets", "show", ...args]);
  const idle = run("hermes", ["pets", "show", "--state", "idle", "--once"]);
  if (idle !== 0) process.exit(idle);
  if (!process.stdout.isTTY) {
    console.error("hblobs show --state run needs a TTY");
    return 0;
  }
  return run("hermes", ["pets", "show", "--state", "run"]);
}

function cmdOpen(repo) {
  const lab = join(repo, "playground", "lab.html");
  if (!existsSync(lab)) fail(`missing ${lab}`);
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const openerArgs = process.platform === "win32" ? ["/c", "start", "", lab] : [lab];
  const status = run(opener, openerArgs);
  console.log(lab);
  return status;
}

function cmdAdopt(repo, args) {
  const status = cli(repo, ["adopt", ...args]);
  if (status !== 0) process.exit(status);
  const slug = packSlug(repo, args);
  return run("hermes", ["pets", "select", slug]);
}

const argv = process.argv.slice(2);
const verb = argv[0] || "new";
const rest = argv[0] ? argv.slice(1) : argv;

if (!LOCKED.includes(verb)) {
  fail(`usage: hblobs <${LOCKED.join("|")}>`);
}

const repo = findRepo();
if (!repo && verb !== "show") {
  fail("HBlobs checkout not found. Set HBLOBS_ROOT. Node must be on PATH.");
}

if (verb === "show") process.exit(cmdShow(rest));
if (verb === "open") process.exit(cmdOpen(repo));
if (verb === "adopt") process.exit(cmdAdopt(repo, rest));
process.exit(cli(repo, [verb, ...rest]));
