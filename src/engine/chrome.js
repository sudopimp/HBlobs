/**
 * Candy volume — not a flat fill plus three white stickers.
 * Key, form shadow, ear-crotch AO, rim, broad sheen, tight specular.
 * Positions live in local face space; the caller maps them through the pose.
 */

export const CHROME_LAYERS = [
  { id: "shade", x: 12, y: 42, rx: 76, ry: 64, fill: "shade", op: 1 },
  { id: "core", x: -10, y: 0, rx: 66, ry: 72, fill: "key", op: 1 },
  { id: "ao-crotch-l", x: -38, y: -38, rx: 22, ry: 14, fill: "ao", op: 0.12, ao: true },
  { id: "ao-crotch-r", x: 38, y: -38, rx: 22, ry: 14, fill: "ao", op: 0.12, ao: true },
  { id: "ao-chin", x: 4, y: 54, rx: 48, ry: 22, fill: "ao", op: 0.1, ao: true },
  { id: "inner-ear-l", x: -46, y: -52, rx: 9, ry: 8, fill: "well", op: 0.24 },
  { id: "inner-ear-r", x: 46, y: -52, rx: 9, ry: 8, fill: "well", op: 0.24 },
  { id: "rim", x: 50, y: -6, rx: 11, ry: 46, fill: "white", op: 0.14 },
  { id: "gloss-main", x: -18, y: -20, rx: 34, ry: 16, fill: "white", op: 0.28, soft: true },
  { id: "spec-hot", x: -24, y: -32, rx: 8, ry: 4.2, fill: "spec", op: 0.92 },
  { id: "gloss-ear-l", x: -50, y: -60, rx: 7, ry: 6, fill: "white", op: 0.48, soft: true },
  { id: "gloss-ear-r", x: 50, y: -60, rx: 7, ry: 6, fill: "white", op: 0.48, soft: true },
];

export function chromeIds(prefix) {
  return {
    key: `${prefix}-key`,
    shade: `${prefix}-shade`,
    spec: `${prefix}-spec`,
    soft: `${prefix}-soft`,
    ao: `${prefix}-ao`,
  };
}

export function chromeDefs(prefix) {
  const id = chromeIds(prefix);
  return `
    <radialGradient id="${id.key}" cx="32%" cy="26%" r="74%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".42"/>
      <stop offset="38%" stop-color="#fff" stop-opacity=".1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id.shade}" cx="68%" cy="92%" r="70%">
      <stop offset="0%" stop-color="#14080c" stop-opacity=".4"/>
      <stop offset="52%" stop-color="#14080c" stop-opacity=".12"/>
      <stop offset="100%" stop-color="#14080c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id.spec}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="35%" stop-color="#fff" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id.soft}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>
    <filter id="${id.ao}" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4.2"/>
    </filter>`;
}

function fillUrl(layer, ids) {
  if (layer.fill === "key") return `url(#${ids.key})`;
  if (layer.fill === "shade") return `url(#${ids.shade})`;
  if (layer.fill === "spec") return `url(#${ids.spec})`;
  if (layer.fill === "well") return "var(--bg)";
  if (layer.fill === "ao") return "#14080c";
  return "#fff";
}

export function chromeLiveMarkup(prefix, cx) {
  const ids = chromeIds(prefix);
  return CHROME_LAYERS.map((layer) => {
    const extra = [];
    if (layer.id === "core") extra.push('data-layer="core"');
    if (layer.id === "gloss-main") extra.push('data-layer="gloss-main"');
    if (layer.id === "gloss-ear-l") extra.push('data-layer="gloss-ear-l"');
    if (layer.id === "gloss-ear-r") extra.push('data-layer="gloss-ear-r"');
    if (layer.id === "inner-ear-l") extra.push('data-inner-ear="l"');
    if (layer.id === "inner-ear-r") extra.push('data-inner-ear="r"');
    const filt = layer.soft ? ` filter="url(#${ids.soft})"` : layer.ao ? ` filter="url(#${ids.ao})"` : "";
    return `<ellipse data-chrome="${layer.id}" ${extra.join(" ")} cx="${cx}" cy="${cx}" rx="${layer.rx}" ry="${layer.ry}" fill="${fillUrl(layer, ids)}" opacity="0"${filt}/>`;
  }).join("");
}

export function chromeRasterEllipses(mapFn, { on, well = "#111110", prefix = "hblob" } = {}) {
  const ids = chromeIds(prefix);
  if (!on) return "";
  return CHROME_LAYERS.map((layer) => {
    const [cx, cy] = mapFn(layer.x, layer.y);
    let fill = "#ffffff";
    if (layer.fill === "key") fill = `url(#${ids.key})`;
    else if (layer.fill === "shade") fill = `url(#${ids.shade})`;
    else if (layer.fill === "spec") fill = `url(#${ids.spec})`;
    else if (layer.fill === "well") fill = well;
    else if (layer.fill === "ao") fill = "#14080c";
    const filt = layer.soft ? ` filter="url(#${ids.soft})"` : layer.ao ? ` filter="url(#${ids.ao})"` : "";
    return `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${layer.rx}" ry="${layer.ry}" fill="${fill}" opacity="${layer.op}"${filt}/>`;
  }).join("");
}
