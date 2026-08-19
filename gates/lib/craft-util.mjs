import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const here = dirname(fileURLToPath(import.meta.url));
export const gatesDir = resolve(here, "..");
export const root = resolve(gatesDir, "..");

export function isTwin() {
  return process.argv.includes("--twin");
}

export function read(path) {
  return readFileSync(path, "utf8");
}

export function fail(token, detail = "") {
  console.error(detail ? `FAIL ${token} ${detail}` : `FAIL ${token}`);
  process.exit(1);
}

export function walkDir(dir, acc = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkDir(p, acc);
    else if (/\.(js|mjs|html)$/.test(name)) acc.push(p);
  }
  return acc;
}

export function walkSrcPlayground() {
  return [...walkDir(join(root, "src")), ...walkDir(join(root, "playground"))];
}

/** One RAF/_tick closure or a playground paint that writes the body path. */
export function tickBarrelsIn(source, file) {
  const barrels = [];
  const hasTickFn =
    /function\s+_tick\b/.test(source) ||
    /(?:this\.|_|\s)_tick\s*=\s*(?:this\._tick\.bind|function|\()/.test(source) ||
    /_tick\s*\(\s*now/.test(source);
  const hasRaf = /requestAnimationFrame\s*\(/.test(source);
  if (hasTickFn && hasRaf) barrels.push({ file, kind: "raf-tick" });

  const hasPaint = /function\s+paint\s*\(/.test(source);
  const paintsBody =
    /body\.setAttribute\(\s*["']d["']/.test(source) ||
    /getElementById\(\s*["']body["']\s*\)/.test(source);
  if (hasPaint && paintsBody) barrels.push({ file, kind: "lab-paint" });
  return barrels;
}

export function parsePoseDefaults(src) {
  const fn = src.match(/function\s+poseDefaults\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  if (!fn) return null;
  const ret = fn[1].match(/return\s*\{([\s\S]*?)\.\.\.pose/);
  if (!ret) return null;
  const body = ret[1];
  const num = (key) => {
    const m = body.match(new RegExp(`\\b${key}\\s*:\\s*([+-]?\\d+(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : NaN;
  };
  return {
    turn: num("turn"),
    tilt: num("tilt"),
    roll: num("roll"),
    scale: num("scale"),
    eyeScale: num("eyeScale"),
    gazeX: num("gazeX"),
    gazeY: num("gazeY"),
  };
}

export function parseEyeEllipses(html) {
  const eyes = [];
  const re = /<ellipse\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const id = attr(attrs, "id");
    if (!id || !/^eye-[lr]$/i.test(id)) continue;
    eyes.push({
      id,
      cx: Number(attr(attrs, "cx")),
      cy: Number(attr(attrs, "cy")),
      rx: Number(attr(attrs, "rx")),
      ry: Number(attr(attrs, "ry")),
      fill: attr(attrs, "fill") ?? "",
    });
  }
  return eyes.sort((a, b) => a.cx - b.cx);
}

function attr(src, name) {
  const m = src.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1] : null;
}

export function previewRootRotate(html) {
  if (/setAttribute\(\s*["']transform["']\s*,\s*[`'"]rotate\s*\(/.test(html)) return true;
  if (/id=["']blob["'][^>]*transform=["'][^"']*rotate\s*\(/.test(html)) return true;
  if (/<g[^>]*id=["']blob["'][^>]*transform=["'][^"']*rotate\s*\(/.test(html)) return true;
  return false;
}

export function wanderAmps(src) {
  const x = src.match(/_gaze\.tx\s*=\s*pose\.gazeX\s*\+\s*\(Math\.random\(\)\s*\*\s*2\s*-\s*1\)\s*\*\s*([0-9.]+)/);
  const y = src.match(/_gaze\.ty\s*=\s*pose\.gazeY\s*\+\s*\(Math\.random\(\)\s*\*\s*2\s*-\s*1\)\s*\*\s*([0-9.]+)/);
  const fx = src.match(/pose\.gazeX\s*\+\s*\(Math\.random\(\)\s*\*\s*2\s*-\s*1\)\s*\*\s*([0-9.]+)/);
  const fy = src.match(/pose\.gazeY\s*\+\s*\(Math\.random\(\)\s*\*\s*2\s*-\s*1\)\s*\*\s*([0-9.]+)/);
  return {
    x: Number((x ?? fx)?.[1] ?? NaN),
    y: Number((y ?? fy)?.[1] ?? NaN),
  };
}

export function circleRing(r = 40, n = 64) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}
