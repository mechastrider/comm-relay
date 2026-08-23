import { t } from "./i18n-ui.js";
import { apiURL } from "./api.js";
import { defaultStyleForTheme, mergeStyle } from "../../overlay/overlay-settings.js";

let presets = [];
let activePresetId = "default";
let bound = false;

function newID(prefix) {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return (
    prefix +
    "_" +
    Array.from(bytes)
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("")
  );
}

function requestPreviewRefresh() {
  document.dispatchEvent(new Event("overlay-preview-refresh"));
}

function fieldValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el) {
    return fallback;
  }
  return el.type === "checkbox" ? el.checked : el.value;
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }
  el.value = value;
}

function collectStyleFromForm() {
  return {
    font_family: fieldValue("overlay-font-family", "system"),
    line_height: Number.parseFloat(fieldValue("overlay-line-height", "1.35")),
    text_edge: fieldValue("overlay-text-edge", "shadow"),
    text_edge_strength: Number.parseInt(fieldValue("overlay-text-edge-strength", "2"), 10),
    platform_marker: fieldValue("overlay-platform-marker", "stripe"),
    panel_color: fieldValue("overlay-panel-color", "#000000"),
    panel_opacity: Number.parseFloat(fieldValue("overlay-panel-opacity", "0.58")),
    panel_image: fieldValue("overlay-panel-image", ""),
    border_width: Number.parseInt(fieldValue("overlay-border-width", "0"), 10),
    border_color: fieldValue("overlay-border-color", "#ffffff"),
    border_radius: Number.parseInt(fieldValue("overlay-border-radius", "8"), 10),
    highlight_border_color: fieldValue("overlay-highlight-border-color", "#f5c542"),
    highlight_text_color: fieldValue("overlay-highlight-text-color", "#ffffff"),
  };
}

function collectPresetFromForm(base) {
  return {
    id: base.id,
    name: String(fieldValue("overlay-preset-name", base.name || "Default") || "Default"),
    max_messages: Number.parseInt(fieldValue("overlay-max-messages", "30"), 10),
    message_ttl_seconds: Number.parseInt(fieldValue("overlay-message-ttl", "20"), 10),
    font_size_px: Number.parseInt(fieldValue("overlay-font-size", "18"), 10),
    display_mode: fieldValue("overlay-display-mode", "normal") === "compact" ? "compact" : "normal",
    theme: fieldValue("overlay-theme", "default"),
    style: collectStyleFromForm(),
  };
}

function normalizePreset(raw) {
  const theme = raw && raw.theme ? raw.theme : "default";
  return {
    id: (raw && raw.id) || newID("preset"),
    name: (raw && raw.name) || "Default",
    max_messages: typeof raw.max_messages === "number" ? raw.max_messages : 30,
    message_ttl_seconds: typeof raw.message_ttl_seconds === "number" ? raw.message_ttl_seconds : 20,
    font_size_px: typeof raw.font_size_px === "number" ? raw.font_size_px : 18,
    display_mode: raw && raw.display_mode === "compact" ? "compact" : "normal",
    theme: theme,
    style: mergeStyle(theme, raw && raw.style),
  };
}

function updatePanelImagePreview(filename) {
  const preview = document.getElementById("overlay-panel-image-preview");
  if (!preview) {
    return;
  }
  if (filename) {
    preview.hidden = false;
    preview.src = "/overlay/assets/" + encodeURIComponent(filename);
  } else {
    preview.hidden = true;
    preview.removeAttribute("src");
  }
}

function writeFormFromPreset(preset) {
  if (!preset) {
    return;
  }
  const style = mergeStyle(preset.theme, preset.style);
  setFieldValue("overlay-preset-name", preset.name || "Default");
  setFieldValue("overlay-max-messages", String(preset.max_messages || 30));
  setFieldValue("overlay-message-ttl", String(preset.message_ttl_seconds || 0));
  setFieldValue("overlay-font-size", String(preset.font_size_px || 18));
  setFieldValue("overlay-display-mode", preset.display_mode === "compact" ? "compact" : "normal");
  setFieldValue("overlay-theme", preset.theme || "default");
  setFieldValue("overlay-font-family", style.font_family);
  setFieldValue("overlay-line-height", String(style.line_height));
  setFieldValue("overlay-text-edge", style.text_edge);
  setFieldValue("overlay-text-edge-strength", String(style.text_edge_strength));
  setFieldValue("overlay-platform-marker", style.platform_marker);
  setFieldValue("overlay-panel-color", style.panel_color);
  setFieldValue("overlay-panel-opacity", String(style.panel_opacity));
  setFieldValue("overlay-panel-image", style.panel_image || "");
  setFieldValue("overlay-border-width", String(style.border_width));
  setFieldValue("overlay-border-color", style.border_color);
  setFieldValue("overlay-border-radius", String(style.border_radius));
  setFieldValue("overlay-highlight-border-color", style.highlight_border_color);
  setFieldValue("overlay-highlight-text-color", style.highlight_text_color);
  updatePanelImagePreview(style.panel_image);
}

function currentPreset() {
  return (
    presets.find(function (preset) {
      return preset.id === activePresetId;
    }) || presets[0]
  );
}

function writeFormIntoActive() {
  const preset = currentPreset();
  if (!preset) {
    return;
  }
  const index = presets.findIndex(function (item) {
    return item.id === preset.id;
  });
  if (index !== -1) {
    presets[index] = collectPresetFromForm(preset);
  }
}

function renderPresetSelect() {
  const select = document.getElementById("overlay-preset-select");
  if (!select) {
    return;
  }
  select.innerHTML = "";
  presets.forEach(function (preset) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name || preset.id;
    select.appendChild(option);
  });
  select.value = activePresetId;
  const remove = document.getElementById("overlay-preset-delete");
  if (remove) {
    remove.disabled = presets.length < 2;
  }
}

export function getActivePresetID() {
  return activePresetId;
}

export function collectAppearanceQuery() {
  writeFormIntoActive();
  const style = collectStyleFromForm();
  const query = {
    preset: activePresetId,
    font_family: style.font_family,
    line_height: String(style.line_height),
    text_edge: style.text_edge,
    text_edge_strength: String(style.text_edge_strength),
    platform_marker: style.platform_marker,
    panel_color: style.panel_color,
    panel_opacity: String(style.panel_opacity),
    border_width: String(style.border_width),
    border_color: style.border_color,
    border_radius: String(style.border_radius),
    highlight_border_color: style.highlight_border_color,
    highlight_text_color: style.highlight_text_color,
  };
  if (style.panel_image) {
    query.panel_image = style.panel_image;
  }
  return query;
}

export function applyOverlayAppearance(overlay) {
  const incoming = overlay && typeof overlay === "object" ? overlay : {};
  if (Array.isArray(incoming.presets) && incoming.presets.length > 0) {
    presets = incoming.presets.map(normalizePreset);
  } else {
    presets = [
      normalizePreset({
        id: "default",
        name: "Default",
        max_messages: incoming.max_messages,
        message_ttl_seconds: incoming.message_ttl_seconds,
        font_size_px: incoming.font_size_px,
        display_mode: incoming.display_mode,
        theme: incoming.theme,
        style: incoming.style,
      }),
    ];
  }
  activePresetId =
    incoming.active_preset_id &&
    presets.some(function (preset) {
      return preset.id === incoming.active_preset_id;
    })
      ? incoming.active_preset_id
      : presets[0].id;
  renderPresetSelect();
  writeFormFromPreset(currentPreset());
}

export function collectOverlayAppearance() {
  writeFormIntoActive();
  const preset = currentPreset() || normalizePreset({ id: "default", name: "Default" });
  return {
    max_messages: preset.max_messages,
    message_ttl_seconds: preset.message_ttl_seconds,
    font_size_px: preset.font_size_px,
    display_mode: preset.display_mode,
    theme: preset.theme,
    active_preset_id: preset.id,
    presets: presets.slice(),
  };
}

function switchPreset(nextId) {
  writeFormIntoActive();
  if (
    !presets.some(function (preset) {
      return preset.id === nextId;
    })
  ) {
    return;
  }
  activePresetId = nextId;
  renderPresetSelect();
  writeFormFromPreset(currentPreset());
  requestPreviewRefresh();
}

function saveAsPreset() {
  writeFormIntoActive();
  if (presets.length >= 32) {
    return;
  }
  const source = currentPreset();
  const typed = String(fieldValue("overlay-preset-name", "") || "").trim();
  const name =
    typed && source && typed !== source.name
      ? typed
      : source
        ? source.name + " " + t("obs.presetCopy")
        : t("obs.presetCopy");
  const copy = collectPresetFromForm({ id: newID("preset"), name: name });
  copy.name = name;
  presets.push(copy);
  activePresetId = copy.id;
  renderPresetSelect();
  writeFormFromPreset(copy);
  requestPreviewRefresh();
}

function deletePreset() {
  if (presets.length < 2) {
    return;
  }
  presets = presets.filter(function (preset) {
    return preset.id !== activePresetId;
  });
  activePresetId = presets[0].id;
  renderPresetSelect();
  writeFormFromPreset(currentPreset());
  requestPreviewRefresh();
}

function resetGroup(group) {
  const theme = fieldValue("overlay-theme", "default");
  const defaults = defaultStyleForTheme(theme);
  if (group === "text") {
    setFieldValue("overlay-font-family", defaults.font_family);
    setFieldValue("overlay-line-height", String(defaults.line_height));
  } else if (group === "surface") {
    setFieldValue("overlay-panel-color", defaults.panel_color);
    setFieldValue("overlay-panel-opacity", String(defaults.panel_opacity));
    setFieldValue("overlay-panel-image", "");
    setFieldValue("overlay-border-width", String(defaults.border_width));
    setFieldValue("overlay-border-color", defaults.border_color);
    setFieldValue("overlay-border-radius", String(defaults.border_radius));
    updatePanelImagePreview("");
  } else {
    setFieldValue("overlay-text-edge", defaults.text_edge);
    setFieldValue("overlay-text-edge-strength", String(defaults.text_edge_strength));
    setFieldValue("overlay-platform-marker", defaults.platform_marker);
  }
  requestPreviewRefresh();
}

async function uploadPanelImage(file) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(apiURL("/api/overlay/assets/upload"), {
    method: "POST",
    body: body,
  });
  const payload = await response.json().catch(function () {
    return null;
  });
  if (!response.ok || !payload || !payload.filename) {
    throw new Error("upload failed");
  }
  setFieldValue("overlay-panel-image", payload.filename);
  updatePanelImagePreview(payload.filename);
  requestPreviewRefresh();
}

export function initOverlayAppearance() {
  if (bound) {
    return;
  }
  bound = true;
  const select = document.getElementById("overlay-preset-select");
  if (select) {
    select.addEventListener("change", function () {
      switchPreset(select.value);
    });
  }
  const saveAs = document.getElementById("overlay-preset-save-as");
  if (saveAs) {
    saveAs.addEventListener("click", saveAsPreset);
  }
  const remove = document.getElementById("overlay-preset-delete");
  if (remove) {
    remove.addEventListener("click", deletePreset);
  }
  document.querySelectorAll("[data-overlay-reset-group]").forEach(function (button) {
    button.addEventListener("click", function () {
      resetGroup(button.dataset.overlayResetGroup);
    });
  });
  const upload = document.getElementById("overlay-panel-image-file");
  if (upload) {
    upload.addEventListener("change", function () {
      if (upload.files && upload.files[0]) {
        uploadPanelImage(upload.files[0]).catch(function () {
          /* keep previous image */
        });
      }
    });
  }
  const clearImage = document.getElementById("overlay-panel-image-clear");
  if (clearImage) {
    clearImage.addEventListener("click", function () {
      setFieldValue("overlay-panel-image", "");
      updatePanelImagePreview("");
      requestPreviewRefresh();
    });
  }
  const theme = document.getElementById("overlay-theme");
  if (theme) {
    theme.addEventListener("change", requestPreviewRefresh);
  }
  [
    "overlay-max-messages",
    "overlay-message-ttl",
    "overlay-font-size",
    "overlay-display-mode",
    "overlay-text-edge",
    "overlay-text-edge-strength",
    "overlay-platform-marker",
    "overlay-font-family",
    "overlay-line-height",
    "overlay-panel-color",
    "overlay-panel-opacity",
    "overlay-border-width",
    "overlay-border-color",
    "overlay-border-radius",
    "overlay-highlight-border-color",
    "overlay-highlight-text-color",
  ].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", requestPreviewRefresh);
      el.addEventListener("input", requestPreviewRefresh);
    }
  });
}
