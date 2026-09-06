const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 48;

const REFERENCE_WIDTHS = {
  panel: 640,
  chips: 520,
};

export function clampLeaderboardFontSize(value) {
  const parsed = Number(value);
  const fallback = 18;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, parsed));
}

export function leaderboardFontSizeForWidth(options) {
  const base = clampLeaderboardFontSize(options && options.baseFontSizePx);
  if (!options || options.sizingMode !== "auto") {
    return base;
  }
  const width = Number(options.width);
  if (!Number.isFinite(width) || width <= 0) {
    return base;
  }
  const layout = options.layout === "chips" ? "chips" : "panel";
  const referenceWidth = REFERENCE_WIDTHS[layout];
  return clampLeaderboardFontSize(base * width / referenceWidth);
}

export function completeRowsThatFit(options) {
  const availableHeight = Math.max(0, Number(options && options.availableHeight) || 0);
  const titleHeight = Math.max(0, Number(options && options.titleHeight) || 0);
  const gap = Math.max(0, Number(options && options.rowGap) || 0);
  const rows = Array.isArray(options && options.rowHeights) ? options.rowHeights : [];
  const maxEntries = Math.max(0, Math.min(rows.length, Number(options && options.maxEntries) || rows.length));
  const previous = Math.max(0, Math.min(maxEntries, Number(options && options.previousCount) || 0));
  const hysteresis = Math.max(0, Number(options && options.hysteresisPx) || 0);

  let used = titleHeight;
  let count = 0;
  for (let index = 0; index < maxEntries; index += 1) {
    const rowHeight = Math.max(0, Number(rows[index]) || 0);
    const next = used + (count > 0 ? gap : 0) + rowHeight;
    if (next > availableHeight) {
      break;
    }
    used = next;
    count += 1;
  }

  if (count > previous && previous > 0 && availableHeight - used < hysteresis) {
    return previous;
  }
  return count;
}

export function fontSizeToFitFirstRow(options) {
  const current = clampLeaderboardFontSize(options && options.fontSizePx);
  if (!options || options.sizingMode !== "auto") {
    return current;
  }
  const available = Math.max(0, Number(options.availableHeight) || 0);
  const required = Math.max(0, Number(options.requiredHeight) || 0);
  if (required <= available || required === 0) {
    return current;
  }
  return clampLeaderboardFontSize(current * available / required);
}

export function isCompactLeaderboard(width, fontSizePx) {
  const resolvedWidth = Math.max(0, Number(width) || 0);
  const resolvedFont = clampLeaderboardFontSize(fontSizePx);
  return resolvedWidth <= Math.max(360, resolvedFont * 24);
}

export function shouldRenderMessageCount(showMessageCount, compact) {
  return showMessageCount === true && compact !== true;
}

export function isLeaderboardSamplePreview(params) {
  return Boolean(
    params &&
    typeof params.get === "function" &&
    String(params.get("preview") || "").trim().toLowerCase() === "sample"
  );
}
