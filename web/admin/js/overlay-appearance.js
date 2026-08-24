import { t } from "./i18n-ui.js";
import { defaultStyleForTheme, mergeStyle } from "../../overlay/overlay-settings.js";
import { uploadOverlayAsset } from "./overlay-asset-upload.js";
import { showBanner } from "./ui-shell.js";

let presets = [];
let activePresetId = "default";
let bound = false;

const PANEL_IMAGE_FIT_VALUES = ["cover", "contain", "fill", "tile"];

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
    panel_image_fit: fieldValue("overlay-panel-image-fit", "cover"),
    panel_image_scope: fieldValue("overlay-panel-image-scope", "message"),
    border_width: Number.parseInt(fieldValue("overlay-border-width", "0"), 10),
    border_color: fieldValue("overlay-border-color", "#ffffff"),
    border_radius: Number.parseInt(fieldValue("overlay-border-radius", "8"), 10),
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
  updatePanelImageOptionsVisibility();
}

function updatePanelImageOptionsVisibility() {
  const options = document.getElementById("overlay-panel-image-options");
  if (!options) {
    return;
  }
  options.hidden = !fieldValue("overlay-panel-image", "");
}

function resetPanelImageFileInput() {
  const upload = document.getElementById("overlay-panel-image-file");
  if (upload) {
    upload.value = "";
  }
}

function setPanelImageError(message) {
  const el = document.getElementById("overlay-panel-image-error");
  if (!el) {
    return;
  }
  if (message) {
    el.hidden = false;
    el.textContent = message;
  } else {
    el.hidden = true;
    el.textContent = "";
  }
}

function setPanelImageFit(value) {
  const fit = PANEL_IMAGE_FIT_VALUES.includes(value) ? value : "cover";
  setFieldValue("overlay-panel-image-fit", fit);
  document.querySelectorAll("[data-panel-image-fit]").forEach(function (button) {
    const active = button.dataset.panelImageFit === fit;
    button.setAttribute("aria-checked", active ? "true" : "false");
    button.classList.toggle("icon-choice--active", active);
  });
}

function initPanelImageFitIcons() {
  const group = document.querySelector(".icon-choice-group[aria-labelledby='overlay-panel-image-fit-label']");
  if (!group) {
    return;
  }
  group.querySelectorAll("[data-panel-image-fit]").forEach(function (button) {
    button.addEventListener("click", function () {
      setPanelImageFit(button.dataset.panelImageFit);
      requestPreviewRefresh();
    });
    button.addEventListener("keydown", function (event) {
      const buttons = Array.from(group.querySelectorAll("[data-panel-image-fit]"));
      const index = buttons.indexOf(button);
      if (index === -1) {
        return;
      }
      let next = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (index + 1) % buttons.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (index - 1 + buttons.length) % buttons.length;
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setPanelImageFit(button.dataset.panelImageFit);
        requestPreviewRefresh();
        return;
      }
      if (next !== -1) {
        event.preventDefault();
        buttons[next].focus();
        setPanelImageFit(buttons[next].dataset.panelImageFit);
        requestPreviewRefresh();
      }
    });
  });
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
  setPanelImageFit(style.panel_image_fit || "cover");
  setFieldValue("overlay-panel-image-scope", style.panel_image_scope || "message");
  setFieldValue("overlay-border-width", String(style.border_width));
  setFieldValue("overlay-border-color", style.border_color);
  setFieldValue("overlay-border-radius", String(style.border_radius));
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
  };
  if (style.panel_image) {
    query.panel_image = style.panel_image;
    query.panel_image_fit = style.panel_image_fit;
    query.panel_image_scope = style.panel_image_scope;
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
    setPanelImageFit(defaults.panel_image_fit);
    setFieldValue("overlay-panel-image-scope", defaults.panel_image_scope);
    setFieldValue("overlay-border-width", String(defaults.border_width));
    setFieldValue("overlay-border-color", defaults.border_color);
    setFieldValue("overlay-border-radius", String(defaults.border_radius));
    updatePanelImagePreview("");
    resetPanelImageFileInput();
  } else {
    setFieldValue("overlay-text-edge", defaults.text_edge);
    setFieldValue("overlay-text-edge-strength", String(defaults.text_edge_strength));
    setFieldValue("overlay-platform-marker", defaults.platform_marker);
  }
  requestPreviewRefresh();
}

async function uploadPanelImage(file) {
  setPanelImageError("");
  const filename = await uploadOverlayAsset(file);
  setFieldValue("overlay-panel-image", filename);
  updatePanelImagePreview(filename);
  requestPreviewRefresh();
}

export function initOverlayAppearance() {
  if (bound) {
    return;
  }
  bound = true;
  initPanelImageFitIcons();
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
      const file = upload.files && upload.files[0];
      if (!file) {
        return;
      }
      uploadPanelImage(file)
        .catch(function (err) {
          const message =
            err && err.message ? err.message : t("obs.assetUploadFailed");
          setPanelImageError(message);
          showBanner("error", message);
        })
        .finally(function () {
          resetPanelImageFileInput();
        });
    });
  }
  const clearImage = document.getElementById("overlay-panel-image-clear");
  if (clearImage) {
    clearImage.addEventListener("click", function () {
      setFieldValue("overlay-panel-image", "");
      updatePanelImagePreview("");
      resetPanelImageFileInput();
      setPanelImageError("");
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
    "overlay-panel-image-scope",
    "overlay-border-width",
    "overlay-border-color",
    "overlay-border-radius",
  ].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", requestPreviewRefresh);
      el.addEventListener("input", requestPreviewRefresh);
    }
  });
}
