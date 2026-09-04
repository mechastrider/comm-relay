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
const PANEL_OPACITY_QUERY = /^(?:(?:0|1)(?:\.\d*)?|\.\d+)$/;

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
  const find = function (id) {
    const wanted = String(id || "").trim();
    if (!wanted) {
      return null;
    }
    for (let i = 0; i < presets.length; i += 1) {
      if (presets[i] && presets[i].id === wanted) {
        return presets[i];
      }
    }
    return null;
  };
  return find(queryPreset) || find(overlay && overlay.active_preset_id) || presets[0] || null;
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

// Return a query opacity only when the complete parameter is a finite value in
// the persisted 0..1 range. Number.parseFloat would accept prefixes such as
// "0.5junk", while an empty query parameter must not become transparent.
export function panelOpacityQueryValue(params) {
  if (!params || typeof params.get !== "function" || typeof params.has !== "function" || !params.has("panel_opacity")) {
    return null;
  }
  const raw = String(params.get("panel_opacity") || "").trim();
  if (!PANEL_OPACITY_QUERY.test(raw)) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
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
  const panelOpacity = panelOpacityQueryValue(params);
  if (panelOpacity !== null) {
    next.panel_opacity = panelOpacity;
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
function themeFromResolvedAndQuery(resolved, query) {
  let theme = resolved && resolved.theme ? resolved.theme : "default";
  if (query && typeof query.get === "function" && typeof query.has === "function") {
    const raw = String(query.get("theme") || "").trim().toLowerCase();
    if (query.has("theme") && THEMES.has(raw)) {
      theme = normalizeTheme(raw);
    }
  }
  return theme;
}

export function overlayViewFromConfig(config, params) {
  return surfaceViewFromConfig(config, params, "chat");
}

function surfaceOpacity(resolved, surface, fallback) {
  const surfaces = resolved && resolved.surfaces && typeof resolved.surfaces === "object"
    ? resolved.surfaces
    : null;
  const override = surfaces && surfaces[surface] && typeof surfaces[surface] === "object"
    ? surfaces[surface].panel_opacity
    : undefined;
  return typeof override === "number" && Number.isFinite(override) && override >= 0 && override <= 1
    ? override
    : fallback;
}

function hasSurfaceOpacityOverride(resolved, surface) {
  const surfaces = resolved && resolved.surfaces && typeof resolved.surfaces === "object"
    ? resolved.surfaces
    : null;
  const override = surfaces && surfaces[surface] && typeof surfaces[surface] === "object"
    ? surfaces[surface].panel_opacity
    : undefined;
  return typeof override === "number" && Number.isFinite(override) && override >= 0 && override <= 1;
}

// Cockpit themes historically supplied their own fixed glass even though their
// shared style opacity default is zero. Keep that legacy appearance only when
// a surface has not opted into an explicit override.
export function panelBackground(theme, style) {
  if (style && style.legacy_cockpit_glass_background) {
    return style.legacy_cockpit_glass_background;
  }
  return hexToRgba(style && style.panel_color, style && style.panel_opacity);
}

function surfaceViewFromConfig(config, params, surface) {
  const overlay = config && typeof config === "object" ? config.overlay : null;
  const query = params && typeof params.get === "function" ? params : undefined;
  const queryPreset = query ? query.get("preset") : params;
  const resolved = resolvePreset(overlay, queryPreset);
  const theme = themeFromResolvedAndQuery(resolved, query);
  const merged = mergeStyle(theme, resolved && resolved.style);
  merged.panel_opacity = surfaceOpacity(resolved, surface, merged.panel_opacity);
  const style = applyQueryStyleOverrides(merged, query);
  markLegacyCockpitGlass(style, resolved, surface, theme, query);

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

function legacyCockpitGlassBackground(theme, surface, layout) {
  if (normalizeTheme(theme) === "g_rebels_popups") {
    return "rgb(5 6 4 / 0.78)";
  }
  if (surface === "chat") {
    return normalizeTheme(theme) === "cockpit_panel"
      ? "rgb(8 17 22 / 0.70)"
      : "rgb(4 13 17 / 0.76)";
  }
  if (surface === "leaderboard" && layout === "chips") {
    return "rgb(4 13 17 / 0.76)";
  }
  if (surface === "leaderboard") {
    return "rgb(8 17 22 / 0.70)";
  }
  return normalizeTheme(theme) === "cockpit_panel"
    ? "rgb(8 17 22 / 0.70)"
    : "rgb(4 13 17 / 0.76)";
}

function markLegacyCockpitGlass(style, resolved, surface, theme, query, layout) {
  style.legacy_cockpit_glass =
    !hasSurfaceOpacityOverride(resolved, surface) &&
    panelOpacityQueryValue(query) === null &&
    style.panel_opacity === 0 &&
    ["cockpit_panel", "cockpit_popups", "g_rebels_popups"].includes(theme);
  style.legacy_cockpit_glass_background = style.legacy_cockpit_glass
    ? legacyCockpitGlassBackground(theme, surface, layout)
    : "";
  return style;
}

// alertViewFromConfig resolves alert chrome independently from chat and leaderboard.
export function alertViewFromConfig(config, params) {
  const overlay = config && typeof config === "object" ? config.overlay : null;
  const query = params && typeof params.get === "function" ? params : undefined;
  const queryPreset = query ? query.get("preset") : params;
  const resolved = resolvePreset(overlay, queryPreset);
  const base = surfaceViewFromConfig(config, params, "alerts");
  const surface =
    resolved &&
    resolved.surfaces &&
    resolved.surfaces.alerts &&
    typeof resolved.surfaces.alerts === "object"
      ? resolved.surfaces.alerts
      : {};
  let imageSizePct = normalizeAlertImageSizePct(surface.image_size_pct);
  const queried = queryIntInRange(
    query,
    "image_size_pct",
    ALERT_IMAGE_SIZE_MIN,
    ALERT_IMAGE_SIZE_MAX
  );
  if (queried !== null) {
    imageSizePct = queried;
  }
  return Object.assign({}, base, { image_size_pct: imageSizePct });
}

const LEADERBOARD_LAYOUTS = new Set(["panel", "chips"]);
const OVERLAY_FONT_SIZE_MIN = 12;
const OVERLAY_FONT_SIZE_MAX = 48;
const ALERT_IMAGE_SIZE_MIN = 25;
const ALERT_IMAGE_SIZE_MAX = 300;
const ALERT_IMAGE_SIZE_DEFAULT = 100;

export function normalizeAlertImageSizePct(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return ALERT_IMAGE_SIZE_DEFAULT;
  }
  return Math.max(
    ALERT_IMAGE_SIZE_MIN,
    Math.min(ALERT_IMAGE_SIZE_MAX, Math.round(parsed))
  );
}

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
  const theme = themeFromResolvedAndQuery(resolved, query);
  const merged = mergeStyle(theme, resolved && resolved.style);
  merged.panel_opacity = surfaceOpacity(resolved, "leaderboard", merged.panel_opacity);
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
  markLegacyCockpitGlass(style, resolved, "leaderboard", theme, query, layout);

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
