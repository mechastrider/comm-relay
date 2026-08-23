export const DEFAULT_PRESET_ID = "default";

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

export function normalizeTheme(theme) {
  const value = String(theme || "").trim().toLowerCase();
  return THEMES.has(value) ? value : "default";
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
    border_width: 0,
    border_color: "#ffffff",
    border_radius: 8,
    highlight_border_color: "#f5c542",
    highlight_text_color: "#ffffff",
  };
  switch (normalizeTheme(theme)) {
    case "dashboard":
      style.platform_marker = "icon";
      style.panel_opacity = 0;
      style.text_edge = "outline";
      break;
    case "cockpit_panel":
    case "g_rebels_popups":
      style.panel_opacity = 0;
      break;
    case "cockpit_popups":
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
    border_width:
      typeof incoming.border_width === "number" ? incoming.border_width : defaults.border_width,
    border_color: incoming.border_color || defaults.border_color,
    border_radius:
      typeof incoming.border_radius === "number" ? incoming.border_radius : defaults.border_radius,
    highlight_border_color: incoming.highlight_border_color || defaults.highlight_border_color,
    highlight_text_color: incoming.highlight_text_color || defaults.highlight_text_color,
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

export function findPerson(people, platform, username, displayName) {
  const plat = String(platform || "").trim().toLowerCase();
  const names = [username, displayName]
    .map(function (value) {
      return String(value || "").trim().toLowerCase();
    })
    .filter(function (value) {
      return value !== "";
    });
  if (plat === "" || names.length === 0 || !Array.isArray(people)) {
    return null;
  }
  for (let i = 0; i < people.length; i += 1) {
    const person = people[i];
    const identities = person && Array.isArray(person.identities) ? person.identities : [];
    for (let j = 0; j < identities.length; j += 1) {
      const identity = identities[j];
      if (!identity || String(identity.platform || "").trim().toLowerCase() !== plat) {
        continue;
      }
      const login = String(identity.username || "").trim().toLowerCase();
      if (login !== "" && names.indexOf(login) !== -1) {
        return person;
      }
    }
  }
  return null;
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitHighlightedText(text, words) {
  const source = String(text || "");
  const list = Array.isArray(words)
    ? words
        .map(function (word) {
          return String(word || "").trim();
        })
        .filter(function (word) {
          return word !== "";
        })
    : [];
  if (source === "" || list.length === 0) {
    return [{ text: source, hit: false }];
  }
  const pattern = list
    .slice()
    .sort(function (a, b) {
      return b.length - a.length;
    })
    .map(escapeRegExp)
    .join("|");
  const re = new RegExp("(?<![\\p{L}\\p{N}_])(" + pattern + ")(?![\\p{L}\\p{N}_])", "giu");
  const parts = [];
  let last = 0;
  let match = re.exec(source);
  while (match) {
    if (match.index > last) {
      parts.push({ text: source.slice(last, match.index), hit: false });
    }
    parts.push({ text: match[0], hit: true });
    last = match.index + match[0].length;
    match = re.exec(source);
  }
  if (last < source.length) {
    parts.push({ text: source.slice(last), hit: false });
  }
  return parts.length > 0 ? parts : [{ text: source, hit: false }];
}

export function messageHasHighlight(text, words, enabled) {
  if (!enabled) {
    return false;
  }
  return splitHighlightedText(text, words).some(function (part) {
    return part.hit;
  });
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
  if (has("highlight_border_color") && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(get("highlight_border_color"))) {
    next.highlight_border_color = get("highlight_border_color");
  }
  if (has("highlight_text_color") && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(get("highlight_text_color"))) {
    next.highlight_text_color = get("highlight_text_color");
  }
  return next;
}

/**
 * Resolved overlay view for rendering: preset display + style, plus global highlights/people.
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
    highlights:
      overlay && overlay.highlights && typeof overlay.highlights === "object"
        ? overlay.highlights
        : { enabled: false, words: [] },
    people: overlay && Array.isArray(overlay.people) ? overlay.people : [],
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
