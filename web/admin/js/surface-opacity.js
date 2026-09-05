const SURFACES = new Set(["chat", "leaderboard", "alerts"]);

export function normalizeOpacitySurface(value) {
  return SURFACES.has(value) ? value : "chat";
}

export function isPanelOpacity(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

// Number inputs permit decimal exponent notation (for example, 1e-1). Parse
// that complete numeric grammar consistently; partial values such as "1e" or
// unrelated JavaScript number spellings are not valid Studio drafts.
const PANEL_OPACITY_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parsePanelOpacity(value) {
  if (typeof value !== "string" || !PANEL_OPACITY_PATTERN.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return isPanelOpacity(parsed) ? parsed : null;
}

// Inputs stay strings while a Studio draft is being edited. Empty and
// out-of-range values are invalid drafts, not an instruction to discard a
// surface override.
export function isPanelOpacityDraft(value) {
  return parsePanelOpacity(value) !== null;
}

export function effectiveSurfaceOpacity(surfaces, surface, fallback) {
  const selected = normalizeOpacitySurface(surface);
  const override =
    surfaces && typeof surfaces === "object" &&
    surfaces[selected] && typeof surfaces[selected] === "object"
      ? surfaces[selected].panel_opacity
      : undefined;
  return isPanelOpacity(override) ? override : fallback;
}

// previewSurfacePanelOpacity resolves the value serialized into a selected Studio preview URL.
export function previewSurfacePanelOpacity(preset, surface, fallback) {
  const style = preset && preset.style && typeof preset.style === "object" ? preset.style : {};
  const shared = isPanelOpacity(style.panel_opacity) ? style.panel_opacity : fallback;
  const selected = normalizeOpacitySurface(surface);
  const surfaceConfig =
    preset && preset.surfaces && typeof preset.surfaces === "object" &&
    preset.surfaces[selected] && typeof preset.surfaces[selected] === "object"
      ? preset.surfaces[selected]
      : null;
  const hasOverride = surfaceConfig && isPanelOpacity(surfaceConfig.panel_opacity);
  const theme = preset && typeof preset.theme === "string" ? preset.theme : "";
  if (!hasOverride && shared === 0 && ["cockpit_panel", "cockpit_popups", "g_rebels_popups"].includes(theme)) {
    return undefined;
  }
  return effectiveSurfaceOpacity(preset && preset.surfaces, surface, shared);
}

// withSurfacePanelOpacity updates just the selected surface while retaining every other override.
export function withSurfacePanelOpacity(surfaces, surface, opacity) {
  const selected = normalizeOpacitySurface(surface);
  const current = surfaces && typeof surfaces === "object" ? surfaces : {};
  const next = {};
  Object.keys(current).forEach(function (key) {
    const value = current[key];
    next[key] = value && typeof value === "object" ? Object.assign({}, value) : value;
  });
  const existing = next[selected] && typeof next[selected] === "object" ? next[selected] : {};
  next[selected] = Object.assign({}, existing, { panel_opacity: opacity });
  return next;
}

export function withAlertsAppearance(surfaces, imageSizePct, fontSizePx, inheritedFontSizePx) {
  const current = surfaces && typeof surfaces === "object" ? surfaces : {};
  const next = {};
  Object.keys(current).forEach(function (key) {
    const value = current[key];
    next[key] = value && typeof value === "object" ? Object.assign({}, value) : value;
  });

  const alerts = next.alerts && typeof next.alerts === "object" ? Object.assign({}, next.alerts) : {};
  if (Number.isFinite(imageSizePct) && imageSizePct !== 100) {
    alerts.image_size_pct = imageSizePct;
  } else {
    delete alerts.image_size_pct;
  }
  if (Number.isFinite(fontSizePx) && fontSizePx !== inheritedFontSizePx) {
    alerts.font_size_px = fontSizePx;
  } else {
    delete alerts.font_size_px;
  }
  next.alerts = alerts;
  return next;
}

// withLeaderboardAppearance stores only values that differ from leaderboard
// inheritance/defaults while retaining opacity and other surface overrides.
export function withLeaderboardAppearance(
  surfaces,
  fontSizePx,
  inheritedFontSizePx,
  layout,
  title,
  maxEntries
) {
  const current = surfaces && typeof surfaces === "object" ? surfaces : {};
  const next = {};
  Object.keys(current).forEach(function (key) {
    const value = current[key];
    next[key] = value && typeof value === "object" ? Object.assign({}, value) : value;
  });

  const leaderboard =
    next.leaderboard && typeof next.leaderboard === "object"
      ? Object.assign({}, next.leaderboard)
      : {};
  if (Number.isFinite(fontSizePx) && fontSizePx !== inheritedFontSizePx) {
    leaderboard.font_size_px = fontSizePx;
  } else {
    delete leaderboard.font_size_px;
  }
  if (layout === "chips") {
    leaderboard.layout = "chips";
  } else {
    delete leaderboard.layout;
  }
  const trimmedTitle = String(title || "").trim();
  if (trimmedTitle !== "") {
    leaderboard.title = trimmedTitle;
  } else {
    delete leaderboard.title;
  }
  const parsedMax = Number.parseInt(String(maxEntries), 10);
  if (Number.isFinite(parsedMax) && parsedMax !== 5) {
    leaderboard.max_entries = parsedMax;
  } else {
    delete leaderboard.max_entries;
  }
  next.leaderboard = leaderboard;
  return next;
}
