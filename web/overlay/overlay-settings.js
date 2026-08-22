"use strict";

export const OVERLAY_FONT_SIZE_MIN = 12;
export const OVERLAY_FONT_SIZE_MAX = 48;

export const FONT_FAMILY_STACKS = {
  system:
    "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
  segoe: "\"Segoe UI\", Arial, sans-serif",
  condensed_hud:
    "\"Roboto Condensed\", \"Arial Narrow\", \"Bahnschrift\", Arial, sans-serif",
};

export const PLATFORM_MARKER_CLASSES = [
  "overlay-platform-marker--stripe",
  "overlay-platform-marker--icon",
  "overlay-platform-marker--both",
  "overlay-platform-marker--none",
];

export const TEXT_EFFECT_CLASSES = [
  "overlay-text-effect--shadow",
  "overlay-text-effect--outline",
  "overlay-text-effect--none",
];

function defaultStyle() {
  return {
    font_family: "system",
    line_height: 1.35,
    message_gap_px: 6,
    text_effect: "shadow",
    text_effect_strength: 2,
    platform_marker: "stripe",
    message_bg_color: "#000000",
    message_bg_opacity: 0.58,
    panel_bg_color: "#000000",
    panel_bg_opacity: 0,
    panel_bg_image: "",
    message_border_color: "#000000",
    message_border_width_px: 0,
    message_border_radius_px: 8,
    panel_border_color: "#000000",
    panel_border_width_px: 0,
  };
}

export function normalizeOverlayStyle(raw) {
  const def = defaultStyle();
  if (!raw || typeof raw !== "object") {
    return def;
  }
  return {
    font_family:
      typeof raw.font_family === "string" && FONT_FAMILY_STACKS[raw.font_family]
        ? raw.font_family
        : def.font_family,
    line_height:
      typeof raw.line_height === "number" && raw.line_height >= 1 && raw.line_height <= 2
        ? raw.line_height
        : def.line_height,
    message_gap_px:
      typeof raw.message_gap_px === "number" && raw.message_gap_px >= 0
        ? raw.message_gap_px
        : def.message_gap_px,
    text_effect:
      raw.text_effect === "outline" || raw.text_effect === "none"
        ? raw.text_effect
        : def.text_effect,
    text_effect_strength:
      typeof raw.text_effect_strength === "number" &&
      raw.text_effect_strength >= 1 &&
      raw.text_effect_strength <= 3
        ? raw.text_effect_strength
        : def.text_effect_strength,
    platform_marker:
      raw.platform_marker === "icon" ||
      raw.platform_marker === "both" ||
      raw.platform_marker === "none"
        ? raw.platform_marker
        : def.platform_marker,
    message_bg_color:
      typeof raw.message_bg_color === "string" && raw.message_bg_color
        ? raw.message_bg_color
        : def.message_bg_color,
    message_bg_opacity:
      typeof raw.message_bg_opacity === "number" && raw.message_bg_opacity >= 0
        ? raw.message_bg_opacity
        : def.message_bg_opacity,
    panel_bg_color:
      typeof raw.panel_bg_color === "string" && raw.panel_bg_color
        ? raw.panel_bg_color
        : def.panel_bg_color,
    panel_bg_opacity:
      typeof raw.panel_bg_opacity === "number" && raw.panel_bg_opacity >= 0
        ? raw.panel_bg_opacity
        : def.panel_bg_opacity,
    panel_bg_image:
      typeof raw.panel_bg_image === "string" ? raw.panel_bg_image.trim() : "",
    message_border_color:
      typeof raw.message_border_color === "string" && raw.message_border_color
        ? raw.message_border_color
        : def.message_border_color,
    message_border_width_px:
      typeof raw.message_border_width_px === "number" &&
      raw.message_border_width_px >= 0
        ? raw.message_border_width_px
        : def.message_border_width_px,
    message_border_radius_px:
      typeof raw.message_border_radius_px === "number" &&
      raw.message_border_radius_px >= 0
        ? raw.message_border_radius_px
        : def.message_border_radius_px,
    panel_border_color:
      typeof raw.panel_border_color === "string" && raw.panel_border_color
        ? raw.panel_border_color
        : def.panel_border_color,
    panel_border_width_px:
      typeof raw.panel_border_width_px === "number" &&
      raw.panel_border_width_px >= 0
        ? raw.panel_border_width_px
        : def.panel_border_width_px,
  };
}

export function resolveOverlayPreset(serverOverlay, presetID) {
  const overlay = serverOverlay && typeof serverOverlay === "object" ? serverOverlay : {};
  const presets = Array.isArray(overlay.presets) ? overlay.presets : [];
  const activeID =
    typeof overlay.active_preset_id === "string" && overlay.active_preset_id
      ? overlay.active_preset_id
      : "default";
  const targetID =
    typeof presetID === "string" && presetID.trim() !== "" ? presetID.trim() : activeID;
  let preset = null;
  for (let i = 0; i < presets.length; i += 1) {
    if (presets[i] && presets[i].id === targetID) {
      preset = presets[i];
      break;
    }
  }
  if (!preset && presets.length > 0) {
    preset = presets[0];
  }
  if (!preset) {
    return {
      id: "default",
      max_messages:
        typeof overlay.max_messages === "number" ? overlay.max_messages : 30,
      message_ttl_seconds:
        typeof overlay.message_ttl_seconds === "number"
          ? overlay.message_ttl_seconds
          : 20,
      font_size_px:
        typeof overlay.font_size_px === "number" ? overlay.font_size_px : 18,
      display_mode:
        overlay.display_mode === "compact" ? "compact" : "normal",
      theme: typeof overlay.theme === "string" ? overlay.theme : "default",
      style: defaultStyle(),
    };
  }
  return {
    id: preset.id || "default",
    max_messages:
      typeof preset.max_messages === "number" ? preset.max_messages : 30,
    message_ttl_seconds:
      typeof preset.message_ttl_seconds === "number"
        ? preset.message_ttl_seconds
        : 20,
    font_size_px:
      typeof preset.font_size_px === "number" ? preset.font_size_px : 18,
    display_mode:
      preset.display_mode === "compact" ? "compact" : "normal",
    theme: typeof preset.theme === "string" ? preset.theme : "default",
    style: normalizeOverlayStyle(preset.style),
  };
}

export function normalizeHighlights(raw) {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, rules: [] };
  }
  const rules = Array.isArray(raw.rules) ? raw.rules : [];
  return {
    enabled: Boolean(raw.enabled),
    rules: rules
      .filter(function (rule) {
        return rule && typeof rule === "object";
      })
      .map(function (rule) {
        return {
          id: typeof rule.id === "string" ? rule.id : "",
          words: Array.isArray(rule.words)
            ? rule.words
                .map(function (word) {
                  return typeof word === "string" ? word.trim() : "";
                })
                .filter(function (word) {
                  return word !== "";
                })
            : [],
          match: rule.match === "word" ? "word" : "word",
          border_color:
            typeof rule.border_color === "string" ? rule.border_color : "",
          text_color: typeof rule.text_color === "string" ? rule.text_color : "",
        };
      }),
  };
}

export function normalizeUserIcons(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(function (entry) {
      return entry && typeof entry === "object";
    })
    .map(function (entry) {
      return {
        platform:
          typeof entry.platform === "string"
            ? entry.platform.trim().toLowerCase()
            : "",
        username:
          typeof entry.username === "string"
            ? entry.username.trim().toLowerCase()
            : "",
        icon: typeof entry.icon === "string" ? entry.icon.trim() : "",
      };
    })
    .filter(function (entry) {
      return entry.platform !== "" && entry.username !== "" && entry.icon !== "";
    });
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function hexToRgba(hex, opacity) {
  const rgb = hexToRgb(hex);
  const alpha = Math.max(0, Math.min(1, opacity));
  return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha + ")";
}

function shadowForStrength(strength) {
  if (strength <= 1) {
    return "0 1px 2px rgba(0, 0, 0, 0.85)";
  }
  if (strength >= 3) {
    return "0 2px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.45)";
  }
  return "0 1px 2px rgba(0, 0, 0, 0.9)";
}

const outlineShadow =
  "0 1px 0 rgba(0, 0, 0, 0.95), 1px 0 0 rgba(0, 0, 0, 0.95), 0 -1px 0 rgba(0, 0, 0, 0.95), -1px 0 0 rgba(0, 0, 0, 0.95), 0 2px 3px rgba(0, 0, 0, 0.85)";

export function applyOverlayStyleTokens(style) {
  const normalized = normalizeOverlayStyle(style);
  const root = document.documentElement;
  const body = document.body;

  root.style.setProperty("--overlay-line-height", String(normalized.line_height));
  root.style.setProperty("--overlay-message-gap", normalized.message_gap_px + "px");
  root.style.setProperty(
    "--overlay-font-family",
    FONT_FAMILY_STACKS[normalized.font_family]
  );
  root.style.setProperty(
    "--overlay-panel-bg",
    hexToRgba(normalized.message_bg_color, normalized.message_bg_opacity)
  );
  root.style.setProperty(
    "--overlay-stage-bg",
    hexToRgba(normalized.panel_bg_color, normalized.panel_bg_opacity)
  );
  root.style.setProperty(
    "--overlay-message-radius",
    normalized.message_border_radius_px + "px"
  );
  root.style.setProperty(
    "--overlay-message-border-width",
    normalized.message_border_width_px + "px"
  );
  root.style.setProperty(
    "--overlay-message-border-color",
    normalized.message_border_color
  );
  root.style.setProperty(
    "--overlay-stage-border-width",
    normalized.panel_border_width_px + "px"
  );
  root.style.setProperty(
    "--overlay-stage-border-color",
    normalized.panel_border_color
  );

  if (normalized.text_effect === "outline") {
    root.style.setProperty("--overlay-text-shadow", outlineShadow);
  } else if (normalized.text_effect === "none") {
    root.style.setProperty("--overlay-text-shadow", "none");
  } else {
    root.style.setProperty(
      "--overlay-text-shadow",
      shadowForStrength(normalized.text_effect_strength)
    );
  }

  if (normalized.panel_bg_image) {
    root.style.setProperty(
      "--overlay-stage-bg-image",
      "url(/overlay-assets/" + encodeURIComponent(normalized.panel_bg_image) + ")"
    );
  } else {
    root.style.removeProperty("--overlay-stage-bg-image");
  }

  PLATFORM_MARKER_CLASSES.forEach(function (cls) {
    body.classList.remove(cls);
  });
  body.classList.add("overlay-platform-marker--" + normalized.platform_marker);

  TEXT_EFFECT_CLASSES.forEach(function (cls) {
    body.classList.remove(cls);
  });
  body.classList.add("overlay-text-effect--" + normalized.text_effect);

  return normalized;
}

const wordCharRe = /[\p{L}\p{N}_]/u;

function isWordChar(ch) {
  return wordCharRe.test(ch);
}

export function messageContainsWord(text, word) {
  if (typeof text !== "string" || typeof word !== "string") {
    return false;
  }
  const lowerText = text.toLocaleLowerCase();
  const lowerWord = word.trim().toLocaleLowerCase();
  if (lowerWord === "") {
    return false;
  }
  let idx = 0;
  while (idx <= lowerText.length) {
    const pos = lowerText.indexOf(lowerWord, idx);
    if (pos === -1) {
      return false;
    }
    const before = pos > 0 ? lowerText[pos - 1] : "";
    const afterPos = pos + lowerWord.length;
    const after = afterPos < lowerText.length ? lowerText[afterPos] : "";
    if (!isWordChar(before) && !isWordChar(after)) {
      return true;
    }
    idx = pos + 1;
  }
  return false;
}

export function findHighlightRule(highlights, messageText) {
  if (!highlights || !highlights.enabled) {
    return null;
  }
  const text = typeof messageText === "string" ? messageText : "";
  for (let i = 0; i < highlights.rules.length; i += 1) {
    const rule = highlights.rules[i];
    for (let j = 0; j < rule.words.length; j += 1) {
      if (messageContainsWord(text, rule.words[j])) {
        return rule;
      }
    }
  }
  return null;
}

export function applyMessageHighlight(row, rule) {
  row.classList.remove("message--highlighted");
  row.style.removeProperty("--message-highlight-border");
  row.style.removeProperty("--message-highlight-text");
  if (!rule) {
    return;
  }
  row.classList.add("message--highlighted");
  if (rule.border_color) {
    row.style.setProperty("--message-highlight-border", rule.border_color);
  }
  if (rule.text_color) {
    row.style.setProperty("--message-highlight-text", rule.text_color);
  }
}

export function frameUsername(frame) {
  if (frame && typeof frame.username === "string" && frame.username !== "") {
    return frame.username.trim().toLowerCase();
  }
  if (frame && typeof frame.user === "string" && frame.user !== "") {
    return frame.user.trim().toLowerCase();
  }
  return "";
}

export function findUserIcon(userIcons, platform, username) {
  const normalizedPlatform =
    typeof platform === "string" ? platform.trim().toLowerCase() : "";
  const normalizedUsername =
    typeof username === "string" ? username.trim().toLowerCase() : "";
  if (normalizedPlatform === "" || normalizedUsername === "") {
    return "";
  }
  for (let i = 0; i < userIcons.length; i += 1) {
    const entry = userIcons[i];
    if (
      entry.platform === normalizedPlatform &&
      entry.username === normalizedUsername
    ) {
      return entry.icon;
    }
  }
  return "";
}

export function overlayAssetURL(filename) {
  if (typeof filename !== "string" || filename.trim() === "") {
    return "";
  }
  return "/overlay-assets/" + encodeURIComponent(filename.trim());
}
