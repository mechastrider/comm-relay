import * as dom from './dom.js';
import { state } from './state.js';
import {
  OVERLAY_FONT_SIZE_MIN,
  OVERLAY_FONT_SIZE_MAX,
  OVERLAY_THEMES,
  OVERLAY_PREVIEW_MODE_KEY,
  OVERLAY_PREVIEW_SURFACE_KEY,
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
import { t } from './i18n-ui.js';
import { collectAppearanceQuery, updatePresetIsland } from './overlay-appearance.js';
import {
  DEFAULT_PREVIEW_BACKGROUND,
  normalizePreviewBackground,
} from '../../overlay/overlay-settings.js';
import { normalizeLeaderboardLayout } from './leaderboard-url.js';
import { parseWorkspaceHash } from "./workspace-router.js";

function isOverlayPreviewActive() {
  return (
    parseWorkspaceHash(window.location.hash) === "studio" ||
    Boolean(dom.overlayDialog && dom.overlayDialog.open)
  );
}

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
      next.theme !== normalizeOverlayTheme(prev.theme) ||
      JSON.stringify(next.presets || []) !== JSON.stringify(prev.presets || []) ||
      next.active_preset_id !== (prev.active_preset_id || "")
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
    const background = normalizePreviewBackground(dom.overlayPreviewBackground.value);
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
    const surface = getPreviewSurface();
    const url = new URL(
      surface === "leaderboard" ? "/overlay/leaderboard" : "/overlay",
      window.location.origin
    );
    const mode = surface === "leaderboard" ? "sample" : previewMode;
    if (mode) {
      url.searchParams.set("preview", mode);
      url.searchParams.set(
        "preview_background",
        normalizePreviewBackground(dom.overlayPreviewBackground && dom.overlayPreviewBackground.value)
      );
    }
    if (surface === "leaderboard") {
      url.searchParams.set(
        "period",
        (dom.overlayLeaderboardPeriod && dom.overlayLeaderboardPeriod.value) ||
          (dom.obsLeaderboardPeriod && dom.obsLeaderboardPeriod.value) ||
          "session"
      );
      url.searchParams.set(
        "layout",
        normalizeLeaderboardLayout(dom.overlayLeaderboardLayout && dom.overlayLeaderboardLayout.value)
      );
      url.searchParams.set(
        "font_size_px",
        String(
          overlayPreviewNumber(
            dom.overlayLeaderboardFontSize,
            OVERLAY_FONT_SIZE_MIN,
            OVERLAY_FONT_SIZE_MAX,
            overlayPreviewNumber(
              dom.overlayFontSize,
              OVERLAY_FONT_SIZE_MIN,
              OVERLAY_FONT_SIZE_MAX,
              typeof persistedOverlay.font_size_px === "number" ? persistedOverlay.font_size_px : 18
            )
          )
        )
      );
    } else {
      url.searchParams.set(
        "max_messages",
        String(
          overlayPreviewNumber(
            dom.overlayMaxMessages,
            1,
            Number.MAX_SAFE_INTEGER,
            typeof persistedOverlay.max_messages === "number" ? persistedOverlay.max_messages : 30
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
            typeof persistedOverlay.font_size_px === "number" ? persistedOverlay.font_size_px : 18
          )
        )
      );
      url.searchParams.set(
        "display_mode",
        dom.overlayDisplayMode && dom.overlayDisplayMode.value === "compact" ? "compact" : "normal"
      );
    }
    url.searchParams.set(
      "theme",
      normalizeOverlayTheme(dom.overlayTheme && dom.overlayTheme.value)
    );
    const extra = collectAppearanceQuery();
    Object.keys(extra).forEach(function (key) {
      if (extra[key] !== "" && extra[key] != null) {
        url.searchParams.set(key, String(extra[key]));
      }
    });
    return url;
  }

export function getPreviewSurface() {
    const pressed = document.querySelector("[data-obs-preview-surface][aria-pressed='true']");
    return pressed && pressed.getAttribute("data-obs-preview-surface") === "leaderboard"
      ? "leaderboard"
      : "chat";
}

export function applyPreviewSurface(surface) {
    const current = surface === "leaderboard" ? "leaderboard" : "chat";
    document.querySelectorAll("[data-obs-preview-surface]").forEach(function (button) {
      const selected = button.getAttribute("data-obs-preview-surface") === current;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      if (button.getAttribute("role") === "tab") {
        button.setAttribute("aria-selected", selected ? "true" : "false");
      }
    });
    if (dom.overlayChatFields) {
      dom.overlayChatFields.hidden = current === "leaderboard";
    }
    if (dom.overlayLeaderboardFields) {
      dom.overlayLeaderboardFields.hidden = current !== "leaderboard";
    }
    document.querySelectorAll(".overlay-chat-only").forEach(function (element) {
      element.hidden = current === "leaderboard";
    });
    writeOverlayPreviewPreference(OVERLAY_PREVIEW_SURFACE_KEY, current);
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
    if (getPreviewSurface() === "leaderboard") {
      dom.overlayPreviewNote.textContent = t("obs.previewNoteLeaderboard");
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
    if (!isOverlayPreviewActive() || !dom.overlayPreviewFrame) {
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
    if (!isOverlayPreviewActive()) {
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

    applyPreviewSurface(
      readOverlayPreviewPreference(OVERLAY_PREVIEW_SURFACE_KEY, "chat")
    );

    document.querySelectorAll("[data-obs-preview-surface]").forEach(function (button) {
      button.addEventListener("click", function () {
        applyPreviewSurface(button.getAttribute("data-obs-preview-surface"));
        updatePresetIsland();
        updateOverlayPreviewNote();
        document.dispatchEvent(new Event("overlay-preview-refresh"));
        refreshOverlayPreview(true);
      });
    });

    const storedBackground = readOverlayPreviewPreference(
      OVERLAY_PREVIEW_BACKGROUND_KEY,
      DEFAULT_PREVIEW_BACKGROUND
    );
    dom.overlayPreviewBackground.value = normalizePreviewBackground(storedBackground);

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

    function syncLeaderboardPeriod(source) {
      const value = source && source.value ? source.value : "session";
      [dom.obsLeaderboardPeriod, dom.overlayLeaderboardPeriod].forEach(function (input) {
        if (input && input !== source) {
          input.value = value;
        }
      });
    }
    if (dom.overlayLeaderboardPeriod && dom.obsLeaderboardPeriod) {
      dom.overlayLeaderboardPeriod.value = dom.obsLeaderboardPeriod.value || "session";
    }
    [dom.obsLeaderboardPeriod, dom.overlayLeaderboardPeriod].filter(Boolean).forEach(function (input) {
      input.addEventListener("change", function () {
        syncLeaderboardPeriod(input);
      });
    });

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
      dom.overlayLeaderboardFontSize,
      dom.overlayLeaderboardLayout,
      dom.overlayLeaderboardPeriod,
      dom.obsLeaderboardPeriod,
    ].filter(Boolean).forEach(function (input) {
      input.addEventListener("input", scheduleOverlayPreviewRefresh);
      input.addEventListener("change", scheduleOverlayPreviewRefresh);
    });

    document.addEventListener("overlay-preview-refresh", scheduleOverlayPreviewRefresh);
    if (dom.overlayDialog) {
      dom.overlayDialog.addEventListener("input", function (event) {
        if (
          event.target &&
          event.target.closest &&
          event.target.closest("#obs-appearance-panel")
        ) {
          scheduleOverlayPreviewRefresh();
        }
      });
    }

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
