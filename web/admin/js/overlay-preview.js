import * as dom from './dom.js';
import { state } from './state.js';
import {
  OVERLAY_FONT_SIZE_MIN,
  OVERLAY_FONT_SIZE_MAX,
  OVERLAY_THEMES,
  OVERLAY_PREVIEW_MODE_KEY,
  OVERLAY_PREVIEW_BACKGROUND_KEY,
  OVERLAY_PREVIEW_WIDTH_KEY,
  OVERLAY_PREVIEW_HEIGHT_KEY,
  OVERLAY_PREVIEW_REFRESH_MS,
  OVERLAY_PREVIEW_DEFAULT_WIDTH,
  OVERLAY_PREVIEW_DEFAULT_HEIGHT,
  OVERLAY_PREVIEW_WIDTH_MIN,
  OVERLAY_PREVIEW_WIDTH_MAX,
  OVERLAY_PREVIEW_HEIGHT_MIN,
  OVERLAY_PREVIEW_HEIGHT_MAX,
  OVERLAY_PREVIEW_SIZES,
} from './constants.js';
import { readStyleFromForm, selectedOverlayPresetID } from './overlay-appearance.js';
import { t } from './i18n-ui.js';

export function overlayDisplaySettingsChanged(payload) {
    if (!state.currentConfig) {
      return true;
    }
    const next = payload.overlay;
    const prev = state.currentConfig.overlay || {};
    return (
      next.max_messages !==
        (typeof prev.max_messages === "number" ? prev.max_messages : 30) ||
      next.message_ttl_seconds !==
        (typeof prev.message_ttl_seconds === "number" ? prev.message_ttl_seconds : 20) ||
      next.font_size_px !==
        (typeof prev.font_size_px === "number" ? prev.font_size_px : 18) ||
      next.display_mode !== (prev.display_mode === "compact" ? "compact" : "normal") ||
      next.theme !== normalizeOverlayTheme(prev.theme)
    );
  }

export function normalizeOverlayTheme(raw) {
    return typeof raw === "string" && OVERLAY_THEMES.indexOf(raw) !== -1
      ? raw
      : "default";
  }

export function readOverlayPreviewPreference(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

export function writeOverlayPreviewPreference(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      /* localStorage can be unavailable in locked-down browser contexts. */
    }
  }

export function clampOverlayPreviewDimension(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

export function overlayPreviewDimensions() {
    return {
      width: clampOverlayPreviewDimension(
        dom.overlayPreviewWidth && dom.overlayPreviewWidth.value,
        OVERLAY_PREVIEW_WIDTH_MIN,
        OVERLAY_PREVIEW_WIDTH_MAX,
        OVERLAY_PREVIEW_DEFAULT_WIDTH
      ),
      height: clampOverlayPreviewDimension(
        dom.overlayPreviewHeight && dom.overlayPreviewHeight.value,
        OVERLAY_PREVIEW_HEIGHT_MIN,
        OVERLAY_PREVIEW_HEIGHT_MAX,
        OVERLAY_PREVIEW_DEFAULT_HEIGHT
      ),
    };
  }

export function overlayPreviewSizePreset(width, height) {
    const presets = Object.keys(OVERLAY_PREVIEW_SIZES);
    for (let i = 0; i < presets.length; i += 1) {
      const size = OVERLAY_PREVIEW_SIZES[presets[i]];
      if (size[0] === width && size[1] === height) {
        return presets[i];
      }
    }
    return "custom";
  }

export function updateOverlayPreviewScale() {
    if (!dom.overlayPreviewStage || !dom.overlayPreviewViewport) {
      return;
    }
    const dimensions = overlayPreviewDimensions();
    const availableWidth = Math.max(0, dom.overlayPreviewStage.clientWidth - 20);
    const availableHeight = Math.max(0, dom.overlayPreviewStage.clientHeight - 20);
    if (availableWidth === 0 || availableHeight === 0) {
      return;
    }
    const scale = Math.min(
      1,
      availableWidth / dimensions.width,
      availableHeight / dimensions.height
    );
    dom.overlayPreviewViewport.style.transform =
      "translate(-50%, -50%) scale(" + String(scale) + ")";
  }

export function applyOverlayPreviewDimensions(options) {
    if (!dom.overlayPreviewViewport || !dom.overlayPreviewWidth || !dom.overlayPreviewHeight) {
      return;
    }
    const dimensions = overlayPreviewDimensions();
    const shouldNormalize = !options || options.normalize !== false;
    const shouldPersist = !options || options.persist !== false;
    if (shouldNormalize) {
      dom.overlayPreviewWidth.value = String(dimensions.width);
      dom.overlayPreviewHeight.value = String(dimensions.height);
    }
    dom.overlayPreviewViewport.style.width = String(dimensions.width) + "px";
    dom.overlayPreviewViewport.style.height = String(dimensions.height) + "px";
    if (dom.overlayPreviewSize) {
      dom.overlayPreviewSize.value = overlayPreviewSizePreset(
        dimensions.width,
        dimensions.height
      );
    }
    if (shouldPersist) {
      writeOverlayPreviewPreference(OVERLAY_PREVIEW_WIDTH_KEY, dimensions.width);
      writeOverlayPreviewPreference(OVERLAY_PREVIEW_HEIGHT_KEY, dimensions.height);
    }
    updateOverlayPreviewScale();
  }

export function applyOverlayPreviewBackground() {
    if (!dom.overlayPreviewBackground) {
      return;
    }
    const backgrounds = ["busy", "checker", "dark"];
    const background = backgrounds.indexOf(dom.overlayPreviewBackground.value) !== -1
      ? dom.overlayPreviewBackground.value
      : "busy";
    dom.overlayPreviewBackground.value = background;
  }

export function overlayPreviewNumber(input, min, max, fallback) {
    const value = Number.parseInt(input && input.value, 10);
    if (!Number.isFinite(value) || value < min || value > max) {
      return fallback;
    }
    return value;
  }

export function buildOverlayPreviewURL(previewMode) {
    const persistedOverlay = state.currentConfig && state.currentConfig.overlay
      ? state.currentConfig.overlay
      : {};
    const url = new URL("/overlay", window.location.origin);
    if (previewMode) {
      url.searchParams.set("preview", previewMode);
      url.searchParams.set(
        "preview_background",
        dom.overlayPreviewBackground && ["busy", "checker", "dark"].indexOf(
          dom.overlayPreviewBackground.value
        ) !== -1
          ? dom.overlayPreviewBackground.value
          : "busy"
      );
    }
    url.searchParams.set(
      "max_messages",
      String(
        overlayPreviewNumber(
          dom.overlayMaxMessages,
          1,
          Number.MAX_SAFE_INTEGER,
          typeof persistedOverlay.max_messages === "number"
            ? persistedOverlay.max_messages
            : 30
        )
      )
    );
    url.searchParams.set(
      "message_ttl_seconds",
      String(
        overlayPreviewNumber(
          dom.overlayMessageTTL,
          0,
          Number.MAX_SAFE_INTEGER,
          typeof persistedOverlay.message_ttl_seconds === "number"
            ? persistedOverlay.message_ttl_seconds
            : 20
        )
      )
    );
    url.searchParams.set(
      "font_size_px",
      String(
        overlayPreviewNumber(
          dom.overlayFontSize,
          OVERLAY_FONT_SIZE_MIN,
          OVERLAY_FONT_SIZE_MAX,
          typeof persistedOverlay.font_size_px === "number"
            ? persistedOverlay.font_size_px
            : 18
        )
      )
    );
    url.searchParams.set(
      "display_mode",
      dom.overlayDisplayMode && dom.overlayDisplayMode.value === "compact"
        ? "compact"
        : "normal"
    );
    url.searchParams.set(
      "theme",
      normalizeOverlayTheme(dom.overlayTheme && dom.overlayTheme.value)
    );
    url.searchParams.set("preset", selectedOverlayPresetID());
    const style = readStyleFromForm();
    url.searchParams.set("style_font_family", style.font_family);
    url.searchParams.set("style_line_height", String(style.line_height));
    url.searchParams.set("style_message_gap_px", String(style.message_gap_px));
    url.searchParams.set("style_text_effect", style.text_effect);
    url.searchParams.set("style_text_effect_strength", String(style.text_effect_strength));
    url.searchParams.set("style_platform_marker", style.platform_marker);
    url.searchParams.set("style_message_bg_color", style.message_bg_color);
    url.searchParams.set("style_message_bg_opacity", String(style.message_bg_opacity));
    url.searchParams.set("style_panel_bg_color", style.panel_bg_color);
    url.searchParams.set("style_panel_bg_opacity", String(style.panel_bg_opacity));
    if (style.panel_bg_image) {
      url.searchParams.set("style_panel_bg_image", style.panel_bg_image);
    }
    url.searchParams.set("style_message_border_color", style.message_border_color);
    url.searchParams.set("style_message_border_width_px", String(style.message_border_width_px));
    url.searchParams.set("style_message_border_radius_px", String(style.message_border_radius_px));
    url.searchParams.set("style_panel_border_color", style.panel_border_color);
    url.searchParams.set("style_panel_border_width_px", String(style.panel_border_width_px));
    return url;
  }

export function updateOverlayPreviewOpenLink() {
    if (dom.overlayPreviewOpen) {
      dom.overlayPreviewOpen.href = buildOverlayPreviewURL("").toString();
    }
  }

export function updateOverlayPreviewNote() {
    if (!dom.overlayPreviewNote || !dom.overlayPreviewMode) {
      return;
    }
    dom.overlayPreviewNote.textContent = dom.overlayPreviewMode.value === "live"
      ? t("obs.previewNoteLive")
      : t("obs.previewNoteSample");
  }

export function refreshOverlayPreview(force) {
    if (state.overlayPreviewRefreshTimer !== null) {
      window.clearTimeout(state.overlayPreviewRefreshTimer);
      state.overlayPreviewRefreshTimer = null;
    }
    updateOverlayPreviewOpenLink();
    if (!dom.overlayDialog || !dom.overlayDialog.open || !dom.overlayPreviewFrame) {
      return;
    }
    const mode = dom.overlayPreviewMode && dom.overlayPreviewMode.value === "live"
      ? "live"
      : "sample";
    const url = buildOverlayPreviewURL(mode);
    const baseURL = url.toString();
    if (!force && dom.overlayPreviewFrame.dataset.previewUrl === baseURL) {
      return;
    }
    state.overlayPreviewRevision += 1;
    url.searchParams.set("_preview_revision", String(state.overlayPreviewRevision));
    dom.overlayPreviewFrame.dataset.previewUrl = baseURL;
    dom.overlayPreviewFrame.src = url.toString();
  }

export function scheduleOverlayPreviewRefresh() {
    updateOverlayPreviewOpenLink();
    if (!dom.overlayDialog || !dom.overlayDialog.open) {
      return;
    }
    if (state.overlayPreviewRefreshTimer !== null) {
      window.clearTimeout(state.overlayPreviewRefreshTimer);
    }
    state.overlayPreviewRefreshTimer = window.setTimeout(function () {
      state.overlayPreviewRefreshTimer = null;
      refreshOverlayPreview(false);
    }, OVERLAY_PREVIEW_REFRESH_MS);
  }

export function mountOverlayPreview() {
    if (!dom.overlayPreviewFrame) {
      return;
    }
    applyOverlayPreviewDimensions({ normalize: true });
    applyOverlayPreviewBackground();
    updateOverlayPreviewNote();
    window.requestAnimationFrame(updateOverlayPreviewScale);
    refreshOverlayPreview(true);
  }

export function unmountOverlayPreview() {
    if (state.overlayPreviewRefreshTimer !== null) {
      window.clearTimeout(state.overlayPreviewRefreshTimer);
      state.overlayPreviewRefreshTimer = null;
    }
    if (!dom.overlayPreviewFrame) {
      return;
    }
    dom.overlayPreviewFrame.dataset.previewUrl = "";
    dom.overlayPreviewFrame.src = "about:blank";
  }

export function initOverlayPreview() {
    if (
      !dom.overlayDialog ||
      !dom.overlayPreviewFrame ||
      !dom.overlayPreviewMode ||
      !dom.overlayPreviewBackground ||
      !dom.overlayPreviewWidth ||
      !dom.overlayPreviewHeight
    ) {
      return;
    }

    const storedMode = readOverlayPreviewPreference(
      OVERLAY_PREVIEW_MODE_KEY,
      "sample"
    );
    dom.overlayPreviewMode.value = storedMode === "live" ? "live" : "sample";

    const storedBackground = readOverlayPreviewPreference(
      OVERLAY_PREVIEW_BACKGROUND_KEY,
      "busy"
    );
    dom.overlayPreviewBackground.value = ["busy", "checker", "dark"].indexOf(
      storedBackground
    ) !== -1
      ? storedBackground
      : "busy";

    dom.overlayPreviewWidth.value = String(
      clampOverlayPreviewDimension(
        readOverlayPreviewPreference(
          OVERLAY_PREVIEW_WIDTH_KEY,
          OVERLAY_PREVIEW_DEFAULT_WIDTH
        ),
        OVERLAY_PREVIEW_WIDTH_MIN,
        OVERLAY_PREVIEW_WIDTH_MAX,
        OVERLAY_PREVIEW_DEFAULT_WIDTH
      )
    );
    dom.overlayPreviewHeight.value = String(
      clampOverlayPreviewDimension(
        readOverlayPreviewPreference(
          OVERLAY_PREVIEW_HEIGHT_KEY,
          OVERLAY_PREVIEW_DEFAULT_HEIGHT
        ),
        OVERLAY_PREVIEW_HEIGHT_MIN,
        OVERLAY_PREVIEW_HEIGHT_MAX,
        OVERLAY_PREVIEW_DEFAULT_HEIGHT
      )
    );

    applyOverlayPreviewDimensions({ normalize: true, persist: false });
    applyOverlayPreviewBackground();
    updateOverlayPreviewNote();
    updateOverlayPreviewOpenLink();

    dom.overlayPreviewMode.addEventListener("change", function () {
      writeOverlayPreviewPreference(
        OVERLAY_PREVIEW_MODE_KEY,
        dom.overlayPreviewMode.value
      );
      updateOverlayPreviewNote();
      refreshOverlayPreview(true);
    });

    dom.overlayPreviewBackground.addEventListener("change", function () {
      applyOverlayPreviewBackground();
      writeOverlayPreviewPreference(
        OVERLAY_PREVIEW_BACKGROUND_KEY,
        dom.overlayPreviewBackground.value
      );
      refreshOverlayPreview(true);
    });

    if (dom.overlayPreviewSize) {
      dom.overlayPreviewSize.addEventListener("change", function () {
        const size = OVERLAY_PREVIEW_SIZES[dom.overlayPreviewSize.value];
        if (!size) {
          return;
        }
        dom.overlayPreviewWidth.value = String(size[0]);
        dom.overlayPreviewHeight.value = String(size[1]);
        applyOverlayPreviewDimensions({ normalize: true });
      });
    }

    [dom.overlayPreviewWidth, dom.overlayPreviewHeight].forEach(function (input) {
      input.addEventListener("input", function () {
        if (dom.overlayPreviewWidth.checkValidity() && dom.overlayPreviewHeight.checkValidity()) {
          applyOverlayPreviewDimensions({ normalize: false });
        }
      });
      input.addEventListener("change", function () {
        applyOverlayPreviewDimensions({ normalize: true });
      });
    });

    [
      dom.overlayMaxMessages,
      dom.overlayMessageTTL,
      dom.overlayFontSize,
      dom.overlayDisplayMode,
      dom.overlayTheme,
    ].forEach(function (input) {
      input.addEventListener("input", scheduleOverlayPreviewRefresh);
      input.addEventListener("change", scheduleOverlayPreviewRefresh);
    });

    if (dom.overlayPreviewReplay) {
      dom.overlayPreviewReplay.addEventListener("click", function () {
        refreshOverlayPreview(true);
      });
    }

    dom.overlayDialog.addEventListener("close", unmountOverlayPreview);
    if (typeof ResizeObserver === "function" && dom.overlayPreviewStage) {
      state.overlayPreviewResizeObserver = new ResizeObserver(updateOverlayPreviewScale);
      state.overlayPreviewResizeObserver.observe(dom.overlayPreviewStage);
    } else {
      window.addEventListener("resize", updateOverlayPreviewScale);
    }
  }
