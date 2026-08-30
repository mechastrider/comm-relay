import { t } from "./i18n-ui.js";
import { state } from "./state.js";
import { defaultStyleForTheme, mergeStyle } from "../../overlay/overlay-settings.js";
import { uploadOverlayAsset } from "./overlay-asset-upload.js";
import { showBanner } from "./ui-shell.js";
import { buildObsOverlayURL } from "./overlay-url.js";
import { buildObsAlertURL } from "./alert-url.js";
import { buildFollowActiveURLForSurface, messageTtlToChipValue, chipValueToMessageTtl } from "./studio-helpers.js";
import { buildLeaderboardURL } from "./leaderboard-url.js";
import { OVERLAY_THEMES } from "./constants.js";
import * as dom from "./dom.js";

let presets = [];
let activePresetId = "default";
let bound = false;
let switchingPreset = false;

const PANEL_IMAGE_FIT_VALUES = ["cover", "contain", "fill", "tile"];
const PRESET_LIMIT = 32;

const THEME_LABEL_KEYS = {
  default: "obs.themeDefault",
  dashboard: "obs.themeTextOnly",
  cockpit_panel: "obs.themeCockpitPanel",
  cockpit_popups: "obs.themeCockpitPopups",
  g_rebels_popups: "obs.themeGRebels",
};

function themeLabel(theme) {
  const key = THEME_LABEL_KEYS[theme] || THEME_LABEL_KEYS.default;
  return t(key);
}

function syncThemeCards() {
  const themeSelect = document.getElementById("overlay-theme");
  const picker = dom.overlayThemePicker;
  if (!themeSelect || !picker) {
    return;
  }
  const current = themeSelect.value || "default";
  picker.querySelectorAll(".theme-card").forEach(function (button) {
    const selected = button.dataset.theme === current;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function setThemeFromCard(themeId) {
  const themeSelect = document.getElementById("overlay-theme");
  if (!themeSelect || !OVERLAY_THEMES.includes(themeId)) {
    return;
  }
  themeSelect.value = themeId;
  syncThemeCards();
  requestPreviewRefresh();
}

function syncDurationChips() {
  const ttlInput = document.getElementById("overlay-message-ttl");
  const chipsRoot = dom.overlayDurationChips;
  if (!ttlInput || !chipsRoot) {
    return;
  }
  const chipValue = messageTtlToChipValue(ttlInput.value);
  chipsRoot.querySelectorAll(".duration-chip").forEach(function (button) {
    const selected = chipValue !== null && Number.parseInt(button.dataset.ttl, 10) === chipValue;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function setDurationFromChip(chipValue) {
  const ttl = chipValueToMessageTtl(chipValue);
  const ttlInput = document.getElementById("overlay-message-ttl");
  if (ttl === null || !ttlInput) {
    return;
  }
  ttlInput.value = String(ttl);
  syncDurationChips();
  requestPreviewRefresh();
}

function refreshThemeCardLabels() {
  const picker = dom.overlayThemePicker;
  if (!picker) {
    return;
  }
  picker.querySelectorAll(".theme-card").forEach(function (button) {
    const themeId = button.dataset.theme;
    if (!themeId) {
      return;
    }
    button.setAttribute("aria-label", themeLabel(themeId));
    const label = button.querySelector(".theme-card__label");
    if (label) {
      label.textContent = themeLabel(themeId);
    }
  });
}

function initThemePicker() {
  const picker = dom.overlayThemePicker;
  const themeSelect = document.getElementById("overlay-theme");
  if (!picker || !themeSelect) {
    return;
  }
  if (picker.dataset.bound !== "true") {
    picker.dataset.bound = "true";
    picker.innerHTML = "";
    OVERLAY_THEMES.forEach(function (themeId) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-card";
      button.dataset.theme = themeId;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-pressed", "false");

      const thumb = document.createElement("span");
      thumb.className = "theme-card__thumb";
      thumb.setAttribute("aria-hidden", "true");

      const label = document.createElement("em");
      label.className = "theme-card__label";

      button.appendChild(thumb);
      button.appendChild(label);
      button.addEventListener("click", function () {
        setThemeFromCard(themeId);
      });
      picker.appendChild(button);
    });
  }
  refreshThemeCardLabels();
  syncThemeCards();
}

function initDurationChips() {
  const chipsRoot = dom.overlayDurationChips;
  if (!chipsRoot || chipsRoot.dataset.bound === "true") {
    return;
  }
  chipsRoot.dataset.bound = "true";
  chipsRoot.querySelectorAll(".duration-chip").forEach(function (button) {
    button.addEventListener("click", function () {
      setDurationFromChip(button.dataset.ttl);
    });
  });
  syncDurationChips();
}

export function syncStudioInspectorEssential(surface) {
  const current = surface === "leaderboard" ? "leaderboard" : surface === "alerts" ? "alerts" : "chat";
  if (dom.studioEssentialFontLeaderboard) {
    dom.studioEssentialFontLeaderboard.hidden = current !== "leaderboard";
  }
  if (dom.studioEssentialPeriod) {
    dom.studioEssentialPeriod.hidden = current !== "leaderboard";
  }
}

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

function notifyStudioDraftChanged() {
  document.dispatchEvent(new Event("studio-overlay-changed"));
}

function requestPreviewRefresh() {
  updatePresetIsland();
  notifyStudioDraftChanged();
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
  const lineHeight = Number.parseFloat(fieldValue("overlay-line-height", "1.35"));
  const textEdgeStrength = Number.parseInt(fieldValue("overlay-text-edge-strength", "2"), 10);
  const panelOpacity = Number.parseFloat(fieldValue("overlay-panel-opacity", "0.58"));
  const borderWidth = Number.parseInt(fieldValue("overlay-border-width", "0"), 10);
  const borderRadius = Number.parseInt(fieldValue("overlay-border-radius", "8"), 10);
  return {
    font_family: fieldValue("overlay-font-family", "system"),
    line_height: Number.isFinite(lineHeight) ? lineHeight : 1.35,
    text_edge: fieldValue("overlay-text-edge", "shadow"),
    text_edge_strength: Number.isFinite(textEdgeStrength) ? textEdgeStrength : 2,
    platform_marker: fieldValue("overlay-platform-marker", "stripe"),
    panel_color: fieldValue("overlay-panel-color", "#000000"),
    panel_opacity: Number.isFinite(panelOpacity) ? panelOpacity : 0.58,
    panel_image: fieldValue("overlay-panel-image", ""),
    panel_image_fit: fieldValue("overlay-panel-image-fit", "cover"),
    panel_image_scope: fieldValue("overlay-panel-image-scope", "message"),
    border_width: Number.isFinite(borderWidth) ? borderWidth : 0,
    border_color: fieldValue("overlay-border-color", "#ffffff"),
    border_radius: Number.isFinite(borderRadius) ? borderRadius : 8,
  };
}

function collectLeaderboardSurface(base) {
  const chatFont = Number.parseInt(fieldValue("overlay-font-size", String((base && base.font_size_px) || 18)), 10);
  const rawFont = Number.parseInt(fieldValue("overlay-leaderboard-font-size", String(chatFont)), 10);
  const layout = fieldValue("overlay-leaderboard-layout", "panel") === "chips" ? "chips" : "panel";
  const leaderboard = {};
  if (Number.isFinite(rawFont) && rawFont !== chatFont) {
    leaderboard.font_size_px = rawFont;
  }
  if (layout === "chips") {
    leaderboard.layout = layout;
  }
  return { leaderboard };
}

function collectPresetFromForm(base) {
  return {
    id: base.id,
    name: String((base && base.name) || "Default"),
    max_messages: Number.parseInt(fieldValue("overlay-max-messages", "30"), 10),
    message_ttl_seconds: Number.parseInt(fieldValue("overlay-message-ttl", "20"), 10),
    font_size_px: Number.parseInt(fieldValue("overlay-font-size", "18"), 10),
    display_mode: fieldValue("overlay-display-mode", "normal") === "compact" ? "compact" : "normal",
    theme: fieldValue("overlay-theme", "default"),
    style: collectStyleFromForm(),
    surfaces: collectLeaderboardSurface(base),
  };
}

function normalizeLeaderboardSurface(raw, fontSizePx) {
  const incoming = raw && raw.leaderboard && typeof raw.leaderboard === "object" ? raw.leaderboard : {};
  const font =
    typeof incoming.font_size_px === "number" && incoming.font_size_px >= 12
      ? incoming.font_size_px
      : fontSizePx;
  return {
    leaderboard: {
      font_size_px: font,
      layout: incoming.layout === "chips" ? "chips" : "panel",
    },
  };
}

function normalizePreset(raw) {
  const theme = raw && raw.theme ? raw.theme : "default";
  const fontSizePx = typeof raw.font_size_px === "number" ? raw.font_size_px : 18;
  return {
    id: (raw && raw.id) || newID("preset"),
    name: (raw && raw.name) || "Default",
    max_messages: typeof raw.max_messages === "number" ? raw.max_messages : 30,
    message_ttl_seconds: typeof raw.message_ttl_seconds === "number" ? raw.message_ttl_seconds : 20,
    font_size_px: fontSizePx,
    display_mode: raw && raw.display_mode === "compact" ? "compact" : "normal",
    theme: theme,
    style: mergeStyle(theme, raw && raw.style),
    surfaces: normalizeLeaderboardSurface(raw && raw.surfaces, fontSizePx),
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
  const leaderboard = normalizeLeaderboardSurface(preset.surfaces, preset.font_size_px || 18).leaderboard;
  setFieldValue("overlay-leaderboard-font-size", String(leaderboard.font_size_px));
  setFieldValue("overlay-leaderboard-layout", leaderboard.layout);
  updatePanelImagePreview(style.panel_image);
  syncThemeCards();
  syncDurationChips();
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

function fillPresetSelect(select) {
  if (!select) {
    return;
  }
  const sameOptions =
    select.options.length === presets.length &&
    presets.every(function (preset, index) {
      const option = select.options[index];
      return option && option.value === preset.id && option.textContent === (preset.name || preset.id);
    });
  if (!sameOptions) {
    select.innerHTML = "";
    presets.forEach(function (preset) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name || preset.id;
      select.appendChild(option);
    });
  }
  select.value = activePresetId;
}

function updatePresetActionButtons() {
  const atLimit = presets.length >= PRESET_LIMIT;
  const onlyOne = presets.length < 2;
  const add = document.getElementById("overlay-preset-add");
  const duplicate = document.getElementById("overlay-preset-duplicate");
  const remove = document.getElementById("overlay-preset-delete");
  if (add) {
    add.disabled = atLimit;
  }
  if (duplicate) {
    duplicate.disabled = atLimit;
  }
  if (remove) {
    remove.disabled = onlyOne;
  }
}

function renderPresetSelect() {
  fillPresetSelect(document.getElementById("overlay-preset-select"));
  updatePresetActionButtons();
}

function getSavedPreset(presetId) {
  const overlay = state.currentConfig && state.currentConfig.overlay;
  if (!overlay || !Array.isArray(overlay.presets)) {
    return null;
  }
  return (
    overlay.presets.find(function (preset) {
      return preset.id === presetId;
    }) || null
  );
}

function presetSnapshotEqual(left, right) {
  return JSON.stringify(normalizePreset(left)) === JSON.stringify(normalizePreset(right));
}

export function isCurrentPresetDirty() {
  if (switchingPreset) {
    return false;
  }
  const base = presets.find(function (preset) {
    return preset.id === activePresetId;
  });
  if (!base) {
    return false;
  }
  // Compare a form snapshot without mutating in-memory presets. Calling
  // writeFormIntoActive() here used to overwrite the active preset with HTML
  // defaults before writeFormFromPreset ran on config load.
  const current = collectPresetFromForm(base);
  const saved = getSavedPreset(activePresetId);
  if (!saved) {
    return true;
  }
  return !presetSnapshotEqual(saved, current);
}

export function getPresets() {
  return presets.slice();
}

export function updatePresetIsland() {
  if (dom.presetIslandCount) {
    dom.presetIslandCount.textContent = t("obs.presetCountCompact", {
      count: String(presets.length),
      limit: String(PRESET_LIMIT),
    });
  }
  const surface = document.querySelector("[data-obs-preview-surface][aria-pressed='true']");
  const previewSurface = surface ? surface.getAttribute("data-obs-preview-surface") : "chat";
  const overlayUrl = buildObsOverlayURL({ presetId: activePresetId });
  const alertUrl = buildObsAlertURL({ presetId: activePresetId });
  if (dom.presetIslandUrl) {
    if (previewSurface === "leaderboard") {
      const leaderboardUrl = currentLeaderboardURL({ pinned: true });
      dom.presetIslandUrl.value = leaderboardUrl;
      dom.presetIslandUrl.title = leaderboardUrl;
    } else if (previewSurface === "alerts") {
      dom.presetIslandUrl.value = alertUrl;
      dom.presetIslandUrl.title = alertUrl;
    } else {
      dom.presetIslandUrl.value = overlayUrl;
      dom.presetIslandUrl.title = overlayUrl;
    }
  }
  const followOverlayUrl = buildObsOverlayURL({ followActive: true });
  if (dom.obsOverlayUrl) {
    dom.obsOverlayUrl.value = followOverlayUrl;
  }
  if (dom.obsOverlayOpen) {
    dom.obsOverlayOpen.href = followOverlayUrl;
  }
  if (dom.obsOverlayUrlPinned) {
    const preset = currentPreset();
    const pinnedLabel = preset ? preset.name || preset.id : activePresetId;
    dom.obsOverlayUrlPinned.value = overlayUrl;
    dom.obsOverlayUrlPinned.title = overlayUrl;
    if (dom.obsOverlayPinnedLabel) {
      dom.obsOverlayPinnedLabel.textContent = t("obs.pinnedPresetNamed", { name: pinnedLabel });
    }
  }
  const followLeaderboardUrl = currentLeaderboardURL({ followActive: true });
  if (dom.obsLeaderboardUrl) {
    dom.obsLeaderboardUrl.value = followLeaderboardUrl;
  }
  if (dom.obsLeaderboardOpen) {
    dom.obsLeaderboardOpen.href = followLeaderboardUrl;
  }
  if (dom.obsLeaderboardUrlPinned) {
    const pinnedLeaderboardUrl = currentLeaderboardURL({ pinned: true });
    dom.obsLeaderboardUrlPinned.value = pinnedLeaderboardUrl;
    dom.obsLeaderboardUrlPinned.title = pinnedLeaderboardUrl;
    const preset = currentPreset();
    const pinnedLabel = preset ? preset.name || preset.id : activePresetId;
    if (dom.obsLeaderboardPinnedLabel) {
      dom.obsLeaderboardPinnedLabel.textContent = t("obs.pinnedPresetNamed", { name: pinnedLabel });
    }
  }
  const followAlertUrl = buildObsAlertURL({ followActive: true });
  if (dom.obsAlertUrl) {
    dom.obsAlertUrl.value = followAlertUrl;
  }
  if (dom.obsAlertOpen) {
    const previewUrl = new URL(followAlertUrl);
    previewUrl.searchParams.set("preview", "sample");
    dom.obsAlertOpen.href = previewUrl.toString();
  }
  if (dom.obsAlertUrlPinned) {
    const pinnedAlertUrl = buildObsAlertURL({ presetId: activePresetId });
    dom.obsAlertUrlPinned.value = pinnedAlertUrl;
    dom.obsAlertUrlPinned.title = pinnedAlertUrl;
    const preset = currentPreset();
    const pinnedLabel = preset ? preset.name || preset.id : activePresetId;
    if (dom.obsAlertPinnedLabel) {
      dom.obsAlertPinnedLabel.textContent = t("obs.pinnedPresetNamed", { name: pinnedLabel });
    }
  }
  if (dom.studioFollowUrl) {
    const period =
      (dom.overlayLeaderboardPeriod && dom.overlayLeaderboardPeriod.value) ||
      (dom.obsLeaderboardPeriod && dom.obsLeaderboardPeriod.value) ||
      "session";
    const followUrl = buildFollowActiveURLForSurface(previewSurface, {
      origin: window.location.origin,
      period: period,
    });
    dom.studioFollowUrl.value = followUrl;
    dom.studioFollowUrl.title = followUrl;
  }
  if (dom.studioPinnedUrl) {
    let pinnedUrl;
    if (previewSurface === "leaderboard") {
      pinnedUrl = currentLeaderboardURL({ pinned: true });
    } else if (previewSurface === "alerts") {
      pinnedUrl = alertUrl;
    } else {
      pinnedUrl = overlayUrl;
    }
    dom.studioPinnedUrl.value = pinnedUrl;
    dom.studioPinnedUrl.title = pinnedUrl;
    const preset = currentPreset();
    const pinnedLabel = preset ? preset.name || preset.id : activePresetId;
    if (dom.studioPinnedUrlLabel) {
      dom.studioPinnedUrlLabel.textContent = t("obs.pinnedPresetNamed", { name: pinnedLabel });
    }
  }
  if (dom.presetUrlStatus) {
    const studioActive =
      dom.studioWorkspace && dom.studioWorkspace.classList.contains("workspace--active");
    const dirty = studioActive
      ? Boolean(
          dom.studioDirtyStatus &&
            dom.studioDirtyStatus.classList.contains("studio-dirty-status--dirty")
        )
      : isCurrentPresetDirty();
    dom.presetUrlStatus.textContent = dirty ? t("obs.presetUrlDirtyShort") : t("obs.presetUrlSavedShort");
    dom.presetUrlStatus.title = dirty ? t("obs.presetUrlDirty") : t("obs.presetUrlSaved");
    dom.presetUrlStatus.classList.toggle("preset-island__status--dirty", dirty);
  }
}

export function renderPresetIsland() {
  renderPresetSelect();
  updatePresetIsland();
}

export function overlayThemeLabel(theme) {
  return themeLabel(theme);
}

export function getActivePresetID() {
  return activePresetId;
}

export function currentLeaderboardURL(options) {
  writeFormIntoActive();
  const preset = currentPreset();
  const surface = preset && preset.surfaces && preset.surfaces.leaderboard ? preset.surfaces.leaderboard : {};
  const chatFont = preset && typeof preset.font_size_px === "number" ? preset.font_size_px : 18;
  const leaderboardFont =
    typeof surface.font_size_px === "number" && surface.font_size_px !== chatFont
      ? surface.font_size_px
      : undefined;
  const opts = options || {};
  const followActive = Boolean(opts.followActive);
  return buildLeaderboardURL({
    period:
      (dom.overlayLeaderboardPeriod && dom.overlayLeaderboardPeriod.value) ||
      (dom.obsLeaderboardPeriod && dom.obsLeaderboardPeriod.value) ||
      "session",
    followActive: followActive,
    preset: followActive ? undefined : activePresetId,
    layout: surface.layout,
    fontSizePx: leaderboardFont,
  });
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
  // Write fields before the preset island refresh so dirty-status reads the
  // loaded preset instead of leftover HTML defaults.
  writeFormFromPreset(currentPreset());
  renderPresetIsland();
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
  if (switchingPreset || !nextId || nextId === activePresetId) {
    return;
  }
  if (
    !presets.some(function (preset) {
      return preset.id === nextId;
    })
  ) {
    return;
  }
  switchingPreset = true;
  try {
    writeFormIntoActive();
    activePresetId = nextId;
    renderPresetSelect();
    writeFormFromPreset(currentPreset());
    requestPreviewRefresh();
  } finally {
    switchingPreset = false;
  }
}

let promptMode = "";

function promptElements() {
  return {
    dialog: document.getElementById("overlay-preset-prompt"),
    title: document.getElementById("overlay-preset-prompt-title"),
    message: document.getElementById("overlay-preset-prompt-message"),
    field: document.getElementById("overlay-preset-prompt-field"),
    input: document.getElementById("overlay-preset-prompt-name"),
    error: document.getElementById("overlay-preset-prompt-error"),
    confirm: document.getElementById("overlay-preset-prompt-confirm"),
  };
}

function closePresetPrompt() {
  const els = promptElements();
  if (els.dialog && els.dialog.open) {
    els.dialog.close();
  }
}

function setPromptError(message) {
  const els = promptElements();
  if (!els.error) {
    return;
  }
  if (message) {
    els.error.hidden = false;
    els.error.textContent = message;
  } else {
    els.error.hidden = true;
    els.error.textContent = "";
  }
}

function openPresetPrompt(mode) {
  const els = promptElements();
  if (!els.dialog) {
    return;
  }
  promptMode = mode;
  setPromptError("");
  const current = currentPreset();
  const currentName = current && current.name ? current.name : "";
  if (mode === "delete") {
    els.title.textContent = t("obs.presetDeleteTitle");
    els.message.hidden = false;
    els.message.textContent = t("obs.presetDeleteConfirm", { name: currentName });
    els.field.hidden = true;
    els.confirm.textContent = t("obs.presetDelete");
  } else {
    els.message.hidden = true;
    els.field.hidden = false;
    if (mode === "create") {
      els.title.textContent = t("obs.presetAddTitle");
      els.input.value = "";
      els.confirm.textContent = t("obs.presetCreate");
    } else if (mode === "rename") {
      els.title.textContent = t("obs.presetRenameTitle");
      els.input.value = currentName;
      els.confirm.textContent = t("obs.presetRenameAction");
    } else {
      els.title.textContent = t("obs.presetDuplicateTitle");
      els.input.value = currentName ? currentName + " " + t("obs.presetCopy") : t("obs.presetCopy");
      els.confirm.textContent = t("obs.presetDuplicateAction");
    }
  }
  if (typeof els.dialog.showModal === "function") {
    els.dialog.showModal();
  }
  if (mode !== "delete" && els.input) {
    els.input.focus();
    els.input.select();
  }
}

function createPreset(name) {
  writeFormIntoActive();
  if (presets.length >= PRESET_LIMIT) {
    return;
  }
  const theme = fieldValue("overlay-theme", "default");
  const preset = normalizePreset({
    id: newID("preset"),
    name: name,
    theme: theme,
    max_messages: 30,
    message_ttl_seconds: 20,
    font_size_px: 18,
    display_mode: "normal",
    style: defaultStyleForTheme(theme),
  });
  presets.push(preset);
  activePresetId = preset.id;
  renderPresetIsland();
  writeFormFromPreset(preset);
  requestPreviewRefresh();
}

function renamePreset(name) {
  writeFormIntoActive();
  const preset = currentPreset();
  if (!preset) {
    return;
  }
  preset.name = name;
  renderPresetIsland();
  requestPreviewRefresh();
}

function duplicatePreset(name) {
  writeFormIntoActive();
  if (presets.length >= PRESET_LIMIT) {
    return;
  }
  const copy = collectPresetFromForm({ id: newID("preset"), name: name });
  copy.name = name;
  presets.push(copy);
  activePresetId = copy.id;
  renderPresetIsland();
  writeFormFromPreset(copy);
  requestPreviewRefresh();
}

function confirmPresetPrompt() {
  const els = promptElements();
  if (promptMode === "delete") {
    closePresetPrompt();
    deletePreset();
    return;
  }
  const name = els.input ? String(els.input.value || "").trim() : "";
  if (!name) {
    setPromptError(t("obs.presetNameRequired"));
    if (els.input) {
      els.input.focus();
    }
    return;
  }
  closePresetPrompt();
  if (promptMode === "create") {
    createPreset(name);
  } else if (promptMode === "rename") {
    renamePreset(name);
  } else if (promptMode === "duplicate") {
    duplicatePreset(name);
  }
}

function deletePreset() {
  if (presets.length < 2) {
    return;
  }
  presets = presets.filter(function (preset) {
    return preset.id !== activePresetId;
  });
  activePresetId = presets[0].id;
  renderPresetIsland();
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
  initThemePicker();
  initDurationChips();
  const appearanceSelect = document.getElementById("overlay-preset-select");
  if (appearanceSelect) {
    appearanceSelect.addEventListener("change", function () {
      switchPreset(appearanceSelect.value);
    });
  }
  const connectionSelect = document.getElementById("obs-overlay-preset-select");
  if (connectionSelect) {
    connectionSelect.addEventListener("change", function () {
      switchPreset(connectionSelect.value);
    });
  }
  const add = document.getElementById("overlay-preset-add");
  if (add) {
    add.addEventListener("click", function () {
      openPresetPrompt("create");
    });
  }
  const rename = document.getElementById("overlay-preset-rename");
  if (rename) {
    rename.addEventListener("click", function () {
      openPresetPrompt("rename");
    });
  }
  const duplicate = document.getElementById("overlay-preset-duplicate");
  if (duplicate) {
    duplicate.addEventListener("click", function () {
      openPresetPrompt("duplicate");
    });
  }
  const remove = document.getElementById("overlay-preset-delete");
  if (remove) {
    remove.addEventListener("click", function () {
      openPresetPrompt("delete");
    });
  }
  const promptCancel = document.getElementById("overlay-preset-prompt-cancel");
  if (promptCancel) {
    promptCancel.addEventListener("click", closePresetPrompt);
  }
  const promptConfirm = document.getElementById("overlay-preset-prompt-confirm");
  if (promptConfirm) {
    promptConfirm.addEventListener("click", confirmPresetPrompt);
  }
  const promptInput = document.getElementById("overlay-preset-prompt-name");
  if (promptInput) {
    promptInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmPresetPrompt();
      }
    });
  }
  if (dom.overlayDialog) {
    dom.overlayDialog.addEventListener("close", closePresetPrompt);
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
    theme.addEventListener("change", function () {
      syncThemeCards();
      requestPreviewRefresh();
    });
  }
  const ttlInput = document.getElementById("overlay-message-ttl");
  if (ttlInput) {
    ttlInput.addEventListener("input", function () {
      syncDurationChips();
      requestPreviewRefresh();
    });
    ttlInput.addEventListener("change", function () {
      syncDurationChips();
      requestPreviewRefresh();
    });
  }
  [
    "overlay-max-messages",
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
    "overlay-leaderboard-font-size",
    "overlay-leaderboard-layout",
    "overlay-leaderboard-period",
  ].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", requestPreviewRefresh);
      el.addEventListener("input", requestPreviewRefresh);
    }
  });

  window.addEventListener("admin-locale-applied", function () {
    refreshThemeCardLabels();
  });
}
