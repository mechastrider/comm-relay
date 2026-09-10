const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 48;
const DESIGN_FONT_SIZE_PX = 18;

const REFERENCE_WIDTHS = {
  banner: 800,
  card: 520,
  fullscreen: 640,
};

export function clampAlertFontSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DESIGN_FONT_SIZE_PX;
  }
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, parsed));
}

export function normalizeAlertLayoutForFit(layout) {
  const value = String(layout || "").trim().toLowerCase();
  return Object.hasOwn(REFERENCE_WIDTHS, value) ? value : "banner";
}

export function alertReferenceWidth(layout) {
  return REFERENCE_WIDTHS[normalizeAlertLayoutForFit(layout)];
}

export function isAlertStripViewport(width, height) {
  const parsedWidth = Number(width);
  const parsedHeight = Number(height);
  if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight) || parsedWidth <= 0 || parsedHeight <= 0) {
    return false;
  }
  return parsedHeight <= 280 && parsedWidth >= parsedHeight * 1.6;
}

export function alertReferenceWidthForViewport(layout, width, height) {
  const normalized = normalizeAlertLayoutForFit(layout);
  if (normalized === "fullscreen" && isAlertStripViewport(width, height)) {
    return REFERENCE_WIDTHS.banner;
  }
  return REFERENCE_WIDTHS[normalized];
}

export function alertFontSizeForWidth(options) {
  const base = clampAlertFontSize(options && options.baseFontSizePx);
  if (!options || options.sizingMode !== "auto") {
    return base;
  }
  const width = Number(options.width);
  if (!Number.isFinite(width) || width <= 0) {
    return base;
  }
  const height = Number(options.height);
  const referenceWidth = alertReferenceWidthForViewport(options.layout, width, height);
  let fontSize = clampAlertFontSize(Math.round((base * width) / referenceWidth));
  if (isAlertStripViewport(width, height)) {
    const heightCap = Math.max(FONT_SIZE_MIN, Math.round(height * 0.11));
    fontSize = clampAlertFontSize(Math.min(fontSize, heightCap));
  }
  return fontSize;
}

export function alertScaleForFontSize(fontSizePx) {
  return clampAlertFontSize(fontSizePx) / DESIGN_FONT_SIZE_PX;
}

export function isAlertSamplePreview(params) {
  return Boolean(
    params &&
    typeof params.get === "function" &&
    String(params.get("preview") || "").trim().toLowerCase() === "sample"
  );
}

export function activeAlertLayoutFromRoot(root) {
  if (!root || typeof root.querySelector !== "function") {
    return "banner";
  }
  const splash = root.querySelector(".alert-splash");
  if (!splash || !splash.classList) {
    return "banner";
  }
  if (splash.classList.contains("alert-splash--layout-card")) {
    return "card";
  }
  if (splash.classList.contains("alert-splash--layout-fullscreen")) {
    return "fullscreen";
  }
  return "banner";
}
