import * as dom from "./dom.js";
import { state } from "./state.js";
import { apiURL } from "./api.js";
import { scheduleOverlayPreviewRefresh } from "./overlay-preview.js";
import { markSettingsDirty } from "./ui-shell.js";
import {
  OVERLAY_FONT_FAMILIES,
  OVERLAY_PLATFORM_MARKERS,
  OVERLAY_TEXT_EFFECTS,
} from "./constants.js";

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

export function selectedOverlayPresetID() {
  if (!dom.overlayPresetSelect) {
    return "default";
  }
  return dom.overlayPresetSelect.value || "default";
}

export function overlayPresetsFromConfig(config) {
  const overlay = config && config.overlay ? config.overlay : {};
  if (Array.isArray(overlay.presets) && overlay.presets.length > 0) {
    return overlay.presets.map(function (preset) {
      return Object.assign({}, preset);
    });
  }
  return [
    {
      id: "default",
      name: "Default",
      max_messages: overlay.max_messages || 30,
      message_ttl_seconds: overlay.message_ttl_seconds || 20,
      font_size_px: overlay.font_size_px || 18,
      display_mode: overlay.display_mode || "normal",
      theme: overlay.theme || "default",
      style: defaultStyle(),
    },
  ];
}

function fillStyleFields(style) {
  const s = style || defaultStyle();
  if (dom.overlayStyleFontFamily) {
    dom.overlayStyleFontFamily.value = s.font_family || "system";
  }
  if (dom.overlayStyleLineHeight) {
    dom.overlayStyleLineHeight.value = String(s.line_height || 1.35);
  }
  if (dom.overlayStyleMessageGap) {
    dom.overlayStyleMessageGap.value = String(s.message_gap_px || 6);
  }
  if (dom.overlayStyleTextEffect) {
    dom.overlayStyleTextEffect.value = s.text_effect || "shadow";
  }
  if (dom.overlayStyleTextEffectStrength) {
    dom.overlayStyleTextEffectStrength.value = String(s.text_effect_strength || 2);
  }
  if (dom.overlayStylePlatformMarker) {
    dom.overlayStylePlatformMarker.value = s.platform_marker || "stripe";
  }
  if (dom.overlayStyleMessageBgColor) {
    dom.overlayStyleMessageBgColor.value = s.message_bg_color || "#000000";
  }
  if (dom.overlayStyleMessageBgOpacity) {
    dom.overlayStyleMessageBgOpacity.value = String(s.message_bg_opacity ?? 0.58);
  }
  if (dom.overlayStylePanelBgColor) {
    dom.overlayStylePanelBgColor.value = s.panel_bg_color || "#000000";
  }
  if (dom.overlayStylePanelBgOpacity) {
    dom.overlayStylePanelBgOpacity.value = String(s.panel_bg_opacity ?? 0);
  }
  if (dom.overlayStylePanelBgImage) {
    dom.overlayStylePanelBgImage.value = s.panel_bg_image || "";
  }
  if (dom.overlayStyleMessageBorderColor) {
    dom.overlayStyleMessageBorderColor.value = s.message_border_color || "#000000";
  }
  if (dom.overlayStyleMessageBorderWidth) {
    dom.overlayStyleMessageBorderWidth.value = String(s.message_border_width_px || 0);
  }
  if (dom.overlayStyleMessageBorderRadius) {
    dom.overlayStyleMessageBorderRadius.value = String(s.message_border_radius_px || 8);
  }
  if (dom.overlayStylePanelBorderColor) {
    dom.overlayStylePanelBorderColor.value = s.panel_border_color || "#000000";
  }
  if (dom.overlayStylePanelBorderWidth) {
    dom.overlayStylePanelBorderWidth.value = String(s.panel_border_width_px || 0);
  }
}

export function readStyleFromForm() {
  return {
    font_family: dom.overlayStyleFontFamily ? dom.overlayStyleFontFamily.value : "system",
    line_height: Number.parseFloat(
      dom.overlayStyleLineHeight ? dom.overlayStyleLineHeight.value : "1.35"
    ),
    message_gap_px: Number.parseInt(
      dom.overlayStyleMessageGap ? dom.overlayStyleMessageGap.value : "6",
      10
    ),
    text_effect: dom.overlayStyleTextEffect ? dom.overlayStyleTextEffect.value : "shadow",
    text_effect_strength: Number.parseInt(
      dom.overlayStyleTextEffectStrength
        ? dom.overlayStyleTextEffectStrength.value
        : "2",
      10
    ),
    platform_marker: dom.overlayStylePlatformMarker
      ? dom.overlayStylePlatformMarker.value
      : "stripe",
    message_bg_color: dom.overlayStyleMessageBgColor
      ? dom.overlayStyleMessageBgColor.value
      : "#000000",
    message_bg_opacity: Number.parseFloat(
      dom.overlayStyleMessageBgOpacity
        ? dom.overlayStyleMessageBgOpacity.value
        : "0.58"
    ),
    panel_bg_color: dom.overlayStylePanelBgColor
      ? dom.overlayStylePanelBgColor.value
      : "#000000",
    panel_bg_opacity: Number.parseFloat(
      dom.overlayStylePanelBgOpacity ? dom.overlayStylePanelBgOpacity.value : "0"
    ),
    panel_bg_image: dom.overlayStylePanelBgImage
      ? dom.overlayStylePanelBgImage.value.trim()
      : "",
    message_border_color: dom.overlayStyleMessageBorderColor
      ? dom.overlayStyleMessageBorderColor.value
      : "#000000",
    message_border_width_px: Number.parseInt(
      dom.overlayStyleMessageBorderWidth
        ? dom.overlayStyleMessageBorderWidth.value
        : "0",
      10
    ),
    message_border_radius_px: Number.parseInt(
      dom.overlayStyleMessageBorderRadius
        ? dom.overlayStyleMessageBorderRadius.value
        : "8",
      10
    ),
    panel_border_color: dom.overlayStylePanelBorderColor
      ? dom.overlayStylePanelBorderColor.value
      : "#000000",
    panel_border_width_px: Number.parseInt(
      dom.overlayStylePanelBorderWidth
        ? dom.overlayStylePanelBorderWidth.value
        : "0",
      10
    ),
  };
}

export function readPresetFromForm() {
  return {
    id: selectedOverlayPresetID(),
    name: dom.overlayPresetName ? dom.overlayPresetName.value.trim() : "Default",
    max_messages: Number.parseInt(dom.overlayMaxMessages.value, 10),
    message_ttl_seconds: Number.parseInt(dom.overlayMessageTTL.value, 10),
    font_size_px: Number.parseInt(dom.overlayFontSize.value, 10),
    display_mode: dom.overlayDisplayMode.value,
    theme: dom.overlayTheme.value,
    style: readStyleFromForm(),
  };
}

export function applyPresetToForm(preset) {
  if (!preset) {
    return;
  }
  dom.overlayMaxMessages.value = String(preset.max_messages);
  dom.overlayMessageTTL.value = String(preset.message_ttl_seconds);
  dom.overlayFontSize.value = String(preset.font_size_px);
  dom.overlayDisplayMode.value =
    preset.display_mode === "compact" ? "compact" : "normal";
  dom.overlayTheme.value = preset.theme || "default";
  if (dom.overlayPresetName) {
    dom.overlayPresetName.value = preset.name || preset.id;
  }
  fillStyleFields(preset.style);
}

export function refreshOverlayPresetSelect(presets, selectedID) {
  if (!dom.overlayPresetSelect) {
    return;
  }
  dom.overlayPresetSelect.innerHTML = "";
  presets.forEach(function (preset) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name || preset.id;
    dom.overlayPresetSelect.appendChild(option);
  });
  if (selectedID && presets.some(function (p) { return p.id === selectedID; })) {
    dom.overlayPresetSelect.value = selectedID;
  } else if (presets.length > 0) {
    dom.overlayPresetSelect.value = presets[0].id;
  }
  if (dom.overlayActivePreset) {
    dom.overlayActivePreset.innerHTML = "";
    presets.forEach(function (preset) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name || preset.id;
      dom.overlayActivePreset.appendChild(option);
    });
  }
}

export function applyOverlayAppearanceFromConfig(config) {
  const overlay = config.overlay || {};
  const presets = overlayPresetsFromConfig(config);
  const activeID =
    typeof overlay.active_preset_id === "string" && overlay.active_preset_id
      ? overlay.active_preset_id
      : presets[0].id;
  refreshOverlayPresetSelect(presets, selectedOverlayPresetID());
  if (dom.overlayActivePreset) {
    dom.overlayActivePreset.value = activeID;
  }
  const current = presets.find(function (p) {
    return p.id === selectedOverlayPresetID();
  }) || presets[0];
  applyPresetToForm(current);

  const highlights = overlay.highlights || {};
  if (dom.overlayHighlightsEnabled) {
    dom.overlayHighlightsEnabled.checked = Boolean(highlights.enabled);
  }
  if (dom.overlayHighlightWords) {
    const words =
      highlights.rules &&
      highlights.rules[0] &&
      Array.isArray(highlights.rules[0].words)
        ? highlights.rules[0].words
        : [];
    dom.overlayHighlightWords.value = words.join("\n");
  }
  if (dom.overlayHighlightBorderColor) {
    dom.overlayHighlightBorderColor.value =
      highlights.rules && highlights.rules[0] && highlights.rules[0].border_color
        ? highlights.rules[0].border_color
        : "#f5c518";
  }
  if (dom.overlayHighlightTextColor) {
    dom.overlayHighlightTextColor.value =
      highlights.rules && highlights.rules[0] && highlights.rules[0].text_color
        ? highlights.rules[0].text_color
        : "#fff3b0";
  }

  renderUserIconsTable(overlay.user_icons || []);
}

function renderUserIconsTable(entries) {
  if (!dom.overlayUserIconsBody) {
    return;
  }
  dom.overlayUserIconsBody.innerHTML = "";
  entries.forEach(function (entry, index) {
    dom.overlayUserIconsBody.appendChild(buildUserIconRow(entry, index));
  });
  if (entries.length === 0) {
    dom.overlayUserIconsBody.appendChild(buildUserIconRow({}, 0));
  }
}

function buildUserIconRow(entry, index) {
  const row = document.createElement("tr");
  row.dataset.userIconIndex = String(index);
  row.innerHTML =
    "<td><select class=\"overlay-user-icon-platform\" data-index=\"" +
    index +
    "\"><option value=\"twitch\">Twitch</option><option value=\"youtube\">YouTube</option><option value=\"vk\">VK</option></select></td>" +
    "<td><input class=\"overlay-user-icon-username\" type=\"text\" data-index=\"" +
    index +
    "\" placeholder=\"username\"></td>" +
    "<td><input class=\"overlay-user-icon-file\" type=\"text\" data-index=\"" +
    index +
    "\" placeholder=\"icon.png\"></td>" +
    "<td><button type=\"button\" class=\"btn-physical btn-small overlay-user-icon-upload\" data-index=\"" +
    index +
    "\">Upload</button></td>" +
    "<td><button type=\"button\" class=\"btn-physical btn-small overlay-user-icon-remove\" data-index=\"" +
    index +
    "\">Remove</button></td>";
  const platform = row.querySelector(".overlay-user-icon-platform");
  const username = row.querySelector(".overlay-user-icon-username");
  const file = row.querySelector(".overlay-user-icon-file");
  if (platform) {
    platform.value = entry.platform || "twitch";
  }
  if (username) {
    username.value = entry.username || "";
  }
  if (file) {
    file.value = entry.icon || "";
  }
  return row;
}

export function readUserIconsFromForm() {
  if (!dom.overlayUserIconsBody) {
    return [];
  }
  const rows = dom.overlayUserIconsBody.querySelectorAll("tr");
  const icons = [];
  rows.forEach(function (row) {
    const platform = row.querySelector(".overlay-user-icon-platform");
    const username = row.querySelector(".overlay-user-icon-username");
    const file = row.querySelector(".overlay-user-icon-file");
    const platformValue = platform ? platform.value.trim().toLowerCase() : "";
    const usernameValue = username ? username.value.trim().toLowerCase() : "";
    const iconValue = file ? file.value.trim() : "";
    if (platformValue && usernameValue && iconValue) {
      icons.push({
        platform: platformValue,
        username: usernameValue,
        icon: iconValue,
      });
    }
  });
  return icons;
}

export function readHighlightsFromForm() {
  const enabled = dom.overlayHighlightsEnabled
    ? dom.overlayHighlightsEnabled.checked
    : false;
  const wordsRaw = dom.overlayHighlightWords
    ? dom.overlayHighlightWords.value
    : "";
  const words = wordsRaw
    .split(/\r?\n/)
    .map(function (word) {
      return word.trim();
    })
    .filter(function (word) {
      return word !== "";
    });
  if (!enabled || words.length === 0) {
    return { enabled: false, rules: [] };
  }
  return {
    enabled: true,
    rules: [
      {
        id: "streamer",
        words: words,
        match: "word",
        border_color: dom.overlayHighlightBorderColor
          ? dom.overlayHighlightBorderColor.value
          : "#f5c518",
        text_color: dom.overlayHighlightTextColor
          ? dom.overlayHighlightTextColor.value
          : "#fff3b0",
      },
    ],
  };
}

export function buildOverlayPayloadFromForm(richChat) {
  const presets = overlayPresetsFromConfig(state.currentConfig || {});
  const updated = readPresetFromForm();
  const idx = presets.findIndex(function (p) {
    return p.id === updated.id;
  });
  if (idx >= 0) {
    presets[idx] = updated;
  } else {
    presets.push(updated);
  }
  const activeID = dom.overlayActivePreset
    ? dom.overlayActivePreset.value
    : updated.id;
  const active =
    presets.find(function (p) {
      return p.id === activeID;
    }) || updated;
  return {
    max_messages: active.max_messages,
    message_ttl_seconds: active.message_ttl_seconds,
    font_size_px: active.font_size_px,
    display_mode: active.display_mode,
    theme: active.theme,
    active_preset_id: activeID,
    presets: presets,
    highlights: readHighlightsFromForm(),
    user_icons: readUserIconsFromForm(),
    emotes: richChat.emotes,
    image_previews: richChat.image_previews,
  };
}

export async function uploadOverlayAsset(file, filename) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", filename || file.name);
  const response = await fetch(apiURL("/api/overlay-assets/upload"), {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("upload failed");
  }
  const payload = await response.json();
  return payload.filename;
}

export function overlaySceneURL(presetID) {
  const url = new URL("/overlay", window.location.origin);
  if (presetID && presetID !== "") {
    url.searchParams.set("preset", presetID);
  }
  return url.toString();
}

export function initOverlayAppearance() {
  if (dom.overlayPresetSelect) {
    dom.overlayPresetSelect.addEventListener("change", function () {
      const presets = overlayPresetsFromConfig(state.currentConfig || {});
      const preset = presets.find(function (p) {
        return p.id === dom.overlayPresetSelect.value;
      });
      if (preset) {
        applyPresetToForm(preset);
        scheduleOverlayPreviewRefresh();
      }
    });
  }

  if (dom.overlayPresetAdd) {
    dom.overlayPresetAdd.addEventListener("click", function () {
      const presets = overlayPresetsFromConfig(state.currentConfig || {});
      const newID = "preset_" + String(Date.now());
      presets.push({
        id: newID,
        name: "New preset",
        max_messages: Number.parseInt(dom.overlayMaxMessages.value, 10),
        message_ttl_seconds: Number.parseInt(dom.overlayMessageTTL.value, 10),
        font_size_px: Number.parseInt(dom.overlayFontSize.value, 10),
        display_mode: dom.overlayDisplayMode.value,
        theme: dom.overlayTheme.value,
        style: readStyleFromForm(),
      });
      if (!state.currentConfig) {
        state.currentConfig = { overlay: {} };
      }
      if (!state.currentConfig.overlay) {
        state.currentConfig.overlay = {};
      }
      state.currentConfig.overlay.presets = presets;
      refreshOverlayPresetSelect(presets, newID);
      const preset = presets.find(function (p) {
        return p.id === newID;
      });
      applyPresetToForm(preset);
      markSettingsDirty();
      scheduleOverlayPreviewRefresh();
    });
  }

  if (dom.overlayPresetDuplicate) {
    dom.overlayPresetDuplicate.addEventListener("click", function () {
      const presets = overlayPresetsFromConfig(state.currentConfig || {});
      const source = readPresetFromForm();
      const newID = source.id + "_copy";
      if (presets.some(function (p) { return p.id === newID; })) {
        return;
      }
      presets.push({
        id: newID,
        name: source.name + " copy",
        max_messages: source.max_messages,
        message_ttl_seconds: source.message_ttl_seconds,
        font_size_px: source.font_size_px,
        display_mode: source.display_mode,
        theme: source.theme,
        style: source.style,
      });
      if (!state.currentConfig.overlay) {
        state.currentConfig.overlay = {};
      }
      state.currentConfig.overlay.presets = presets;
      refreshOverlayPresetSelect(presets, newID);
      applyPresetToForm(presets[presets.length - 1]);
      markSettingsDirty();
      scheduleOverlayPreviewRefresh();
    });
  }

  if (dom.overlayPresetDelete) {
    dom.overlayPresetDelete.addEventListener("click", function () {
      const presets = overlayPresetsFromConfig(state.currentConfig || {});
      if (presets.length <= 1) {
        return;
      }
      const removeID = selectedOverlayPresetID();
      const next = presets.filter(function (p) {
        return p.id !== removeID;
      });
      state.currentConfig.overlay.presets = next;
      refreshOverlayPresetSelect(next, next[0].id);
      applyPresetToForm(next[0]);
      markSettingsDirty();
      scheduleOverlayPreviewRefresh();
    });
  }

  if (dom.overlayCopySceneURL) {
    dom.overlayCopySceneURL.addEventListener("click", function () {
      const url = overlaySceneURL(selectedOverlayPresetID());
      navigator.clipboard.writeText(url).catch(function () {
        /* clipboard may be unavailable */
      });
      if (dom.obsCopyStatus) {
        dom.obsCopyStatus.textContent = url;
      }
    });
  }

  if (dom.overlayPanelBgUpload) {
    dom.overlayPanelBgUpload.addEventListener("change", function () {
      const input = dom.overlayPanelBgUpload;
      const file = input.files && input.files[0];
      if (!file) {
        return;
      }
      uploadOverlayAsset(file, file.name)
        .then(function (filename) {
          if (dom.overlayStylePanelBgImage) {
            dom.overlayStylePanelBgImage.value = filename;
          }
          markSettingsDirty();
          scheduleOverlayPreviewRefresh();
        })
        .catch(function () {
          /* upload errors surface on save */
        })
        .finally(function () {
          input.value = "";
        });
    });
  }

  if (dom.overlayUserIconAdd) {
    dom.overlayUserIconAdd.addEventListener("click", function () {
      const rows = dom.overlayUserIconsBody
        ? dom.overlayUserIconsBody.querySelectorAll("tr").length
        : 0;
      if (dom.overlayUserIconsBody) {
        dom.overlayUserIconsBody.appendChild(buildUserIconRow({}, rows));
      }
      markSettingsDirty();
    });
  }

  if (dom.overlayUserIconsBody) {
    dom.overlayUserIconsBody.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.classList.contains("overlay-user-icon-remove")) {
        const row = target.closest("tr");
        if (row && dom.overlayUserIconsBody.children.length > 1) {
          row.remove();
          markSettingsDirty();
        }
      }
      if (target.classList.contains("overlay-user-icon-upload")) {
        const row = target.closest("tr");
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
        fileInput.addEventListener("change", function () {
          const file = fileInput.files && fileInput.files[0];
          if (!file || !row) {
            return;
          }
          uploadOverlayAsset(file, file.name)
            .then(function (filename) {
              const fileField = row.querySelector(".overlay-user-icon-file");
              if (fileField) {
                fileField.value = filename;
              }
              markSettingsDirty();
            })
            .catch(function () {
              /* ignore */
            });
        });
        fileInput.click();
      }
    });
    dom.overlayUserIconsBody.addEventListener("input", function () {
      markSettingsDirty();
    });
  }

  const styleInputs = [
    dom.overlayStyleFontFamily,
    dom.overlayStyleLineHeight,
    dom.overlayStyleMessageGap,
    dom.overlayStyleTextEffect,
    dom.overlayStyleTextEffectStrength,
    dom.overlayStylePlatformMarker,
    dom.overlayStyleMessageBgColor,
    dom.overlayStyleMessageBgOpacity,
    dom.overlayStylePanelBgColor,
    dom.overlayStylePanelBgOpacity,
    dom.overlayStylePanelBgImage,
    dom.overlayStyleMessageBorderColor,
    dom.overlayStyleMessageBorderWidth,
    dom.overlayStyleMessageBorderRadius,
    dom.overlayStylePanelBorderColor,
    dom.overlayStylePanelBorderWidth,
    dom.overlayHighlightWords,
    dom.overlayHighlightBorderColor,
    dom.overlayHighlightTextColor,
    dom.overlayHighlightsEnabled,
    dom.overlayActivePreset,
    dom.overlayPresetName,
  ];
  styleInputs.forEach(function (input) {
    if (!input) {
      return;
    }
    input.addEventListener("input", function () {
      markSettingsDirty();
      scheduleOverlayPreviewRefresh();
    });
    input.addEventListener("change", function () {
      markSettingsDirty();
      scheduleOverlayPreviewRefresh();
    });
  });
}
