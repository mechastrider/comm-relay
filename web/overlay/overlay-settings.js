export const FONT_STACKS = {
  system:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif',
  segoe: '"Segoe UI", "Noto Sans", Arial, sans-serif',
  georgia: 'Georgia, "Noto Serif", "Times New Roman", serif',
  trebuchet: '"Trebuchet MS", "Noto Sans", Arial, sans-serif',
  mono: 'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Noto Sans Mono", Consolas, monospace',
};

const THEMES = new Set([
  "default",
  "dashboard",
  "cockpit_panel",
  "cockpit_popups",
  "g_rebels_popups",
]);

const PANEL_IMAGE_FITS = new Set(["cover", "contain", "fill", "tile"]);
const PANEL_IMAGE_SCOPES = new Set(["message", "column"]);

export function normalizeTheme(theme) {
  const value = String(theme || "").trim().toLowerCase();
  return THEMES.has(value) ? value : "default";
}

export function normalizePanelImageFit(value) {
  const fit = String(value || "").trim().toLowerCase();
  return PANEL_IMAGE_FITS.has(fit) ? fit : "cover";
}

export function normalizePanelImageScope(value, theme) {
  const scope = String(value || "").trim().toLowerCase();
  if (scope === "column" && normalizeTheme(theme) === "default") {
    return "column";
  }
  return "message";
}

const PREVIEW_BACKGROUNDS = new Set(["white", "checker", "scene", "dark"]);
const PREVIEW_BACKGROUND_ALIASES = {
  busy: "scene",
  black: "dark",
};

export const DEFAULT_PREVIEW_BACKGROUND = "scene";

export function normalizePreviewBackground(raw) {
  const value = String(raw || "").trim().toLowerCase();
  const mapped = PREVIEW_BACKGROUND_ALIASES[value] || value;
  return PREVIEW_BACKGROUNDS.has(mapped) ? mapped : DEFAULT_PREVIEW_BACKGROUND;
}

export function defaultStyleForTheme(theme) {
  const style = {
    font_family: "system",
    line_height: 1.35,
    text_edge: "shadow",
    text_edge_strength: 2,
    platform_marker: "stripe",
    panel_color: "#000000",
    panel_opacity: 0.58,
    panel_image: "",
    panel_image_fit: "cover",
    panel_image_scope: "message",
    border_width: 0,
    border_color: "#ffffff",
    border_radius: 8,
  };
  switch (normalizeTheme(theme)) {
    case "dashboard":
      style.platform_marker = "icon";
      style.panel_opacity = 0;
      style.text_edge = "outline";
      break;
    case "cockpit_panel":
      style.panel_opacity = 0;
      break;
    case "cockpit_popups":
    case "g_rebels_popups":
      style.platform_marker = "both";
      style.panel_opacity = 0;
      break;
    default:
      break;
  }
  return style;
}

export function mergeStyle(theme, style) {
  const defaults = defaultStyleForTheme(normalizeTheme(theme));
  const incoming = style && typeof style === "object" ? style : {};
  return {
    font_family: incoming.font_family || defaults.font_family,
    line_height:
      typeof incoming.line_height === "number" && incoming.line_height > 0
        ? incoming.line_height
        : defaults.line_height,
    text_edge: incoming.text_edge || defaults.text_edge,
    text_edge_strength:
      typeof incoming.text_edge_strength === "number"
        ? incoming.text_edge_strength
        : defaults.text_edge_strength,
    platform_marker: incoming.platform_marker || defaults.platform_marker,
    panel_color: incoming.panel_color || defaults.panel_color,
    panel_opacity:
      typeof incoming.panel_opacity === "number" ? incoming.panel_opacity : defaults.panel_opacity,
    panel_image: typeof incoming.panel_image === "string" ? incoming.panel_image : defaults.panel_image,
    panel_image_fit: normalizePanelImageFit(incoming.panel_image_fit || defaults.panel_image_fit),
    panel_image_scope:
      incoming.panel_image_scope === "column" ? "column" : defaults.panel_image_scope,
    border_width:
      typeof incoming.border_width === "number" ? incoming.border_width : defaults.border_width,
    border_color: incoming.border_color || defaults.border_color,
    border_radius:
      typeof incoming.border_radius === "number" ? incoming.border_radius : defaults.border_radius,
  };
}

export function resolvePreset(overlay, queryPreset) {
  const presets = Array.isArray(overlay && overlay.presets) ? overlay.presets : [];
  const wanted =
    String(queryPreset || "").trim() ||
    String((overlay && overlay.active_preset_id) || "").trim();
  if (wanted) {
    for (let i = 0; i < presets.length; i += 1) {
      if (presets[i] && presets[i].id === wanted) {
        return presets[i];
      }
    }
  }
  return presets[0] || null;
}

export function hexToRgba(hex, opacity) {
  const raw = String(hex || "").trim();
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return "rgba(0, 0, 0, 0)";
  }
  let value = match[1];
  if (value.length === 3) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
  }
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const alpha = Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

export function fontStack(fontFamily) {
  return FONT_STACKS[fontFamily] || FONT_STACKS.system;
}

export function applyQueryStyleOverrides(style, params) {
  const next = Object.assign({}, style);
  const get = typeof params.get === "function" ? params.get.bind(params) : function () { return null; };
  const has = typeof params.has === "function" ? params.has.bind(params) : function () { return false; };
  if (has("font_family") && FONT_STACKS[get("font_family")]) {
    next.font_family = get("font_family");
  }
  if (has("line_height")) {
    const value = Number.parseFloat(get("line_height"));
    if (Number.isFinite(value) && value >= 1 && value <= 2) {
      next.line_height = value;
    }
  }
  if (has("text_edge") && ["none", "shadow", "outline"].indexOf(get("text_edge")) !== -1) {
    next.text_edge = get("text_edge");
  }
  if (has("text_edge_strength")) {
    const value = Number.parseInt(get("text_edge_strength"), 10);
    if (Number.isFinite(value) && value >= 0 && value <= 8) {
      next.text_edge_strength = value;
    }
  }
  if (has("platform_marker") && ["stripe", "icon", "both", "none"].indexOf(get("platform_marker")) !== -1) {
    next.platform_marker = get("platform_marker");
  }
  if (has("panel_color") && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(get("panel_color"))) {
    next.panel_color = get("panel_color");
  }
  if (has("panel_opacity")) {
    const value = Number.parseFloat(get("panel_opacity"));
    if (Number.isFinite(value) && value >= 0 && value <= 1) {
      next.panel_opacity = value;
    }
  }
  if (has("panel_image")) {
    next.panel_image = get("panel_image") || "";
  }
  if (has("panel_image_fit") && PANEL_IMAGE_FITS.has(get("panel_image_fit"))) {
    next.panel_image_fit = get("panel_image_fit");
  }
  if (has("panel_image_scope") && PANEL_IMAGE_SCOPES.has(get("panel_image_scope"))) {
    next.panel_image_scope = get("panel_image_scope");
  }
  if (has("border_width")) {
    const value = Number.parseInt(get("border_width"), 10);
    if (Number.isFinite(value) && value >= 0 && value <= 8) {
      next.border_width = value;
    }
  }
  if (has("border_color") && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(get("border_color"))) {
    next.border_color = get("border_color");
  }
  if (has("border_radius")) {
    const value = Number.parseInt(get("border_radius"), 10);
    if (Number.isFinite(value) && value >= 0 && value <= 24) {
      next.border_radius = value;
    }
  }
  return next;
}

/**
 * Resolved overlay view for rendering.
 *
 * @param {unknown} config
 * @param {URLSearchParams|string} [params]
 * @returns {object}
 */
export function overlayViewFromConfig(config, params) {
  const overlay = config && typeof config === "object" ? config.overlay : null;
  const queryPreset =
    params && typeof params.get === "function" ? params.get("preset") : params;
  const resolved = resolvePreset(overlay, queryPreset);
  const theme = resolved && resolved.theme ? resolved.theme : "default";
  const merged = mergeStyle(theme, resolved && resolved.style);
  const style = applyQueryStyleOverrides(merged, params && typeof params.get === "function" ? params : undefined);

  return {
    max_messages: resolved && typeof resolved.max_messages === "number" ? resolved.max_messages : 30,
    message_ttl_seconds:
      resolved && typeof resolved.message_ttl_seconds === "number" ? resolved.message_ttl_seconds : 20,
    font_size_px: resolved && typeof resolved.font_size_px === "number" ? resolved.font_size_px : 18,
    display_mode: resolved && resolved.display_mode === "compact" ? "compact" : "normal",
    theme: theme,
    style: style,
  };
}

const LEADERBOARD_LAYOUTS = new Set(["panel", "chips"]);
const OVERLAY_FONT_SIZE_MIN = 12;
const OVERLAY_FONT_SIZE_MAX = 48;

export function normalizeLeaderboardLayout(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return LEADERBOARD_LAYOUTS.has(value) ? value : "panel";
}

function queryIntInRange(params, key, min, max) {
  if (!params || typeof params.get !== "function" || typeof params.has !== "function" || !params.has(key)) {
    return null;
  }
  const value = Number.parseInt(params.get(key), 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}

export function leaderboardViewFromConfig(config, params) {
  const overlay = config && typeof config === "object" ? config.overlay : null;
  const query = params && typeof params.get === "function" ? params : undefined;
  const queryPreset = query ? query.get("preset") : params;
  const resolved = resolvePreset(overlay, queryPreset);
  let theme = resolved && resolved.theme ? resolved.theme : "default";
  if (query && typeof query.get === "function") {
    const queriedTheme = normalizeTheme(query.get("theme"));
    if (query.has("theme") && THEMES.has(String(query.get("theme") || "").trim().toLowerCase())) {
      theme = queriedTheme;
    }
  }
  const merged = mergeStyle(theme, resolved && resolved.style);
  const style = applyQueryStyleOverrides(merged, query);
  const surface =
    resolved && resolved.surfaces && resolved.surfaces.leaderboard && typeof resolved.surfaces.leaderboard === "object"
      ? resolved.surfaces.leaderboard
      : {};
  let fontSizePx =
    typeof surface.font_size_px === "number" && surface.font_size_px >= OVERLAY_FONT_SIZE_MIN
      ? surface.font_size_px
      : resolved && typeof resolved.font_size_px === "number"
        ? resolved.font_size_px
        : 18;
  const queriedFont = queryIntInRange(query, "font_size_px", OVERLAY_FONT_SIZE_MIN, OVERLAY_FONT_SIZE_MAX);
  if (queriedFont !== null) {
    fontSizePx = queriedFont;
  }
  let layout = normalizeLeaderboardLayout(surface.layout);
  if (query && typeof query.has === "function" && query.has("layout")) {
    const queriedLayout = String(query.get("layout") || "").trim().toLowerCase();
    if (LEADERBOARD_LAYOUTS.has(queriedLayout)) {
      layout = queriedLayout;
    }
  }

  return {
    font_size_px: fontSizePx,
    theme: normalizeTheme(theme),
    style: style,
    layout: layout,
  };
}

export function overlayAssetURL(filename, cacheBust) {
  const name = String(filename || "").trim();
  if (name === "") {
    return "";
  }
  const suffix = cacheBust ? "?v=" + encodeURIComponent(String(cacheBust)) : "";
  return "/overlay/assets/" + encodeURIComponent(name) + suffix;
}
