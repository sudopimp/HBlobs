import { readFileSync } from "node:fs";

const PNG_RE = /canvas\.width\s*=\s*512|toDataURL\(|blob\.png|#111110/;
const PACK_RE = /spritesheet\.webp|pet\.json|exportPack/;

export function parseCta(html) {
  const btn =
    html.match(/<button[^>]*class="[^"]*cta[^"]*"[^>]*>([^<]*)<\/button>/i) ||
    html.match(/<button[^>]*id="png"[^>]*>([^<]*)<\/button>/i);
  const label = (btn?.[1] ?? "").replace(/\s+/g, " ").trim();
  const writesPng = PNG_RE.test(html);
  const writesPack = PACK_RE.test(html);
  const pngNamed = /descargar\s*png|id="png"/i.test(html) || /png/i.test(label);
  return { label, writesPng, writesPack, pngNamed };
}

export function readCta(path) {
  return parseCta(readFileSync(path, "utf8"));
}
