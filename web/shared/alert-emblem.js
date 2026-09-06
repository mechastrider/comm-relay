const SVG_NS = "http://www.w3.org/2000/svg";

const COMMAND_SYMBOLS = Object.freeze({
  gg: "flags",
  hi: "broadcast",
});

const AWARD_SYMBOLS = Object.freeze({
  like: "thumbs-spark",
  joke: "joke",
  advice: "compass",
  spotter: "reticle",
  intel: "radar",
  expert: "star",
  meme: "glitch",
  clutch: "shield-bolt",
  mvp: "laurel-star",
});

const GENERIC_SYMBOLS = Object.freeze({
  command: ["signal", "prompt", "pulse"],
  award: ["medal", "gem", "burst"],
});

const SYMBOL_SHAPES = Object.freeze({
  flags: [
    ["path", { d: "M19 48 43 16M45 48 21 16" }],
    ["path", { d: "M23 18H10v15h17M41 18h13v15H37" }],
  ],
  broadcast: [
    ["circle", { cx: "32", cy: "32", r: "4", fill: "currentColor", stroke: "none" }],
    ["path", { d: "M23 23a13 13 0 0 0 0 18M41 23a13 13 0 0 1 0 18M16 16a23 23 0 0 0 0 32M48 16a23 23 0 0 1 0 32" }],
  ],
  "thumbs-spark": [
    ["path", { d: "M24 52h19c3 0 5-2 6-5l4-14c1-4-2-7-6-7H37v-9c0-3-2-5-5-5l-8 17Z" }],
    ["rect", { x: "10", y: "28", width: "14", height: "25", rx: "3" }],
    ["path", { d: "M50 7c0 5 3 8 8 8-5 0-8 3-8 8 0-5-3-8-8-8 5 0 8-3 8-8Z" }],
  ],
  joke: [
    ["path", { d: "M13 22c7-7 31-7 38 0l-3 21c-8 8-24 8-32 0Z" }],
    ["path", { d: "M21 29c3-3 6-3 9 0M34 29c3-3 6-3 9 0M22 38c6 6 14 6 20 0" }],
  ],
  compass: [
    ["circle", { cx: "32", cy: "32", r: "21" }],
    ["path", { d: "m40 20-5 15-15 9 9-15Z" }],
    ["circle", { cx: "32", cy: "32", r: "2", fill: "currentColor", stroke: "none" }],
  ],
  reticle: [
    ["circle", { cx: "32", cy: "32", r: "16" }],
    ["circle", { cx: "32", cy: "32", r: "6" }],
    ["path", { d: "M32 7v13M32 44v13M7 32h13M44 32h13" }],
  ],
  radar: [
    ["circle", { cx: "32", cy: "32", r: "22" }],
    ["circle", { cx: "32", cy: "32", r: "13", opacity: ".55" }],
    ["path", { d: "M32 32 48 16M32 10v44M10 32h44" }],
    ["circle", { cx: "43", cy: "25", r: "3", fill: "currentColor", stroke: "none" }],
  ],
  star: [
    ["path", { d: "m32 10 6.4 13 14.3 2.1-10.4 10.1 2.5 14.3L32 42.8l-12.8 6.7 2.5-14.3-10.4-10.1L25.6 23Z" }],
    ["path", { d: "M24 53h16", opacity: ".55" }],
  ],
  glitch: [
    ["path", { d: "M16 18h29v8H30v7h18v13H19v-7H9V27h7Z" }],
    ["path", { d: "M12 13h23M29 51h23M9 44h8M47 20h8" }],
  ],
  "shield-bolt": [
    ["path", { d: "M32 9c8 6 15 7 21 8v14c0 12-8 20-21 25-13-5-21-13-21-25V17c6-1 13-2 21-8Z" }],
    ["path", { d: "m35 17-12 18h9l-3 13 13-19h-9Z", fill: "currentColor", stroke: "none" }],
  ],
  "laurel-star": [
    ["path", { d: "M20 50C9 42 8 27 16 17M44 50c11-8 12-23 4-33M14 24l7 3M12 34l8 1M17 44l7-2M50 24l-7 3M52 34l-8 1M47 44l-7-2" }],
    ["path", { d: "m32 16 4.2 8.5 9.4 1.4-6.8 6.6 1.6 9.3-8.4-4.4-8.4 4.4 1.6-9.3-6.8-6.6 9.4-1.4Z" }],
  ],
  signal: [
    ["path", { d: "M12 41h8l5-20 8 28 6-18 4 10h9" }],
    ["path", { d: "M13 16h15M36 16h15", opacity: ".55" }],
  ],
  prompt: [
    ["path", { d: "m15 20 13 12-13 12M33 44h17" }],
    ["rect", { x: "9", y: "12", width: "46", height: "40", rx: "7", opacity: ".45" }],
  ],
  pulse: [
    ["circle", { cx: "32", cy: "32", r: "8" }],
    ["path", { d: "M32 9v10M32 45v10M9 32h10M45 32h10M16 16l7 7M41 41l7 7M48 16l-7 7M23 41l-7 7" }],
  ],
  medal: [
    ["circle", { cx: "32", cy: "35", r: "17" }],
    ["path", { d: "m21 9 7 12M43 9l-7 12M32 27l2.6 5.2 5.8.9-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.9Z" }],
  ],
  gem: [
    ["path", { d: "m18 16-8 12 22 27 22-27-8-12ZM10 28h44M18 16l14 39 14-39M18 16l14 12 14-12" }],
  ],
  burst: [
    ["path", { d: "m32 8 6 12 13-4-3 13 11 7-11 7 3 13-13-4-6 12-6-12-13 4 3-13-11-7 11-7-3-13 13 4Z" }],
    ["circle", { cx: "32", cy: "36", r: "7" }],
  ],
});

function normalizedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of normalizedText(value)) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function monogram(value) {
  const words = normalizedText(value).toLocaleUpperCase().match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length > 1) {
    return Array.from(words[0])[0] + Array.from(words[1])[0];
  }
  return words.length === 1 ? Array.from(words[0]).slice(0, 2).join("") : "?";
}

export function alertEmblemModel(kind, identifier, label) {
  const normalizedKind = kind === "award" ? "award" : "command";
  const normalizedIdentifier = normalizedText(identifier).toLocaleLowerCase();
  const semantic = normalizedKind === "award" ? AWARD_SYMBOLS : COMMAND_SYMBOLS;
  const hashKey = normalizedKind + ":" + (normalizedIdentifier || normalizedText(label));
  const hash = stableHash(hashKey);
  const fallbackSymbols = GENERIC_SYMBOLS[normalizedKind];
  const symbol = semantic[normalizedIdentifier] || fallbackSymbols[hash % fallbackSymbols.length];
  return {
    kind: normalizedKind,
    identifier: normalizedIdentifier,
    symbol,
    variant: hash % 3,
    monogram: semantic[normalizedIdentifier] ? "" : monogram(label || normalizedIdentifier),
  };
}

function svgElement(documentRef, tagName, attributes) {
  const element =
    typeof documentRef.createElementNS === "function"
      ? documentRef.createElementNS(SVG_NS, tagName)
      : documentRef.createElement(tagName);
  Object.entries(attributes || {}).forEach(function ([name, value]) {
    element.setAttribute(name, value);
  });
  return element;
}

export function createAlertEmblem(documentRef, options = {}) {
  const model = alertEmblemModel(options.kind, options.identifier, options.label);
  const root = documentRef.createElement("div");
  root.className =
    "alert-emblem alert-emblem--" + model.kind +
    " alert-emblem--symbol-" + model.symbol +
    " alert-emblem--variant-" + String(model.variant);
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("data-emblem-symbol", model.symbol);

  const svg = svgElement(documentRef, "svg", {
    class: "alert-emblem__svg",
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "3",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  });
  (SYMBOL_SHAPES[model.symbol] || SYMBOL_SHAPES.signal).forEach(function ([tagName, attrs]) {
    svg.append(svgElement(documentRef, tagName, attrs));
  });
  root.append(svg);

  if (model.monogram) {
    const label = documentRef.createElement("span");
    label.className = "alert-emblem__monogram";
    label.textContent = model.monogram;
    root.append(label);
  }

  const orbit = documentRef.createElement("span");
  orbit.className = "alert-emblem__orbit";
  root.append(orbit);
  return root;
}
