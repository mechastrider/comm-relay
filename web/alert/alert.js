"use strict";

import {
  fontStack,
  panelBackground,
  normalizePanelImageFit,
  normalizePanelImageScope,
  normalizePreviewBackground,
  overlayAssetURL,
  alertViewFromConfig,
} from "/overlay/overlay-settings.js?v=6";
import { createChatRender } from "/shared/chat-render.js?v=12";
import { ensureAudioContext, scheduleAlertSound } from "./alert-sound.js";
import { startSplashLifecycle } from "./alert-lifecycle.js?v=2";
import { createAlertSplash } from "./alert-render.js?v=2";
import { createAlertScheduler } from "./alert-scheduler.js?v=2";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const DEFAULT_DURATION_MS = 5000;
const OVERLAY_FONT_SIZE_MIN = 12;
const OVERLAY_FONT_SIZE_MAX = 48;
const THEME_CLASSES = [
  "overlay-theme--default",
  "overlay-theme--dashboard",
  "overlay-theme--cockpit-panel",
  "overlay-theme--cockpit-popups",
  "overlay-theme--g-rebels-popups",
];
const PREVIEW_BACKGROUND_CLASSES = [
  "overlay-preview--white",
  "overlay-preview--checker",
  "overlay-preview--scene",
  "overlay-preview--dark",
  "overlay-preview--busy",
];

const params = new URLSearchParams(window.location.search);
const samplePreviewEnabled = params.get("preview") === "sample";
const previewEnabled = params.has("preview");

const root = document.getElementById("alert-root");
let overlayView = alertViewFromConfig({ overlay: null }, params);
let overlayAssetsRevision = Date.now();
let socket = null;
let reconnectTimer = null;
let reconnectDelayMs = INITIAL_RECONNECT_MS;
let shouldRun = true;
let audioCtx = null;
let hideTimer = null;
const scheduler = createAlertScheduler();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SAMPLE_ALERT = {
  source: "award",
  name: "Nova",
  avatar_url: "",
  award_name: "Spotter",
  points: 25,
  message_text: "Невероятный фланг — that timing was perfect.",
  sound: "chime",
  duration_ms: 5000,
};
const { userAccent } = createChatRender();

function wsURL() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/ws";
}

function applyAppearance() {
  const style = overlayView.style || {};
  const fontSize = overlayView.font_size_px;
  const size =
    fontSize >= OVERLAY_FONT_SIZE_MIN && fontSize <= OVERLAY_FONT_SIZE_MAX ? fontSize : 18;
  document.documentElement.style.setProperty("--overlay-font-size", String(size) + "px");
  document.documentElement.style.setProperty(
    "--overlay-line-height",
    String(style.line_height || 1.35)
  );
  document.documentElement.style.setProperty("--overlay-font-family", fontStack(style.font_family));
  document.documentElement.style.setProperty(
    "--overlay-text-edge-strength",
    String(style.text_edge_strength || 0)
  );
  document.documentElement.style.setProperty(
    "--overlay-panel-bg",
    panelBackground(overlayView.theme, style)
  );
  document.documentElement.style.setProperty(
    "--overlay-panel-opacity",
    String(typeof style.panel_opacity === "number" ? style.panel_opacity : 0.58)
  );
  document.documentElement.style.setProperty(
    "--overlay-panel-image",
    style.panel_image
      ? 'url("' + overlayAssetURL(style.panel_image, overlayAssetsRevision) + '")'
      : "none"
  );
  document.documentElement.style.setProperty(
    "--overlay-border-width",
    String(style.border_width || 0) + "px"
  );
  document.documentElement.style.setProperty("--overlay-border-color", style.border_color || "#ffffff");
  document.documentElement.style.setProperty(
    "--overlay-border-radius",
    String(style.border_radius || 0) + "px"
  );
  document.body.style.fontFamily = fontStack(style.font_family);
  THEME_CLASSES.forEach(function (cls) {
    document.body.classList.remove(cls);
  });
  document.body.classList.add(
    "overlay-theme--" + String(overlayView.theme || "default").replace(/_/g, "-")
  );
  document.body.classList.remove(
    "overlay-text-edge--none",
    "overlay-text-edge--shadow",
    "overlay-text-edge--outline"
  );
  const edge =
    style.text_edge === "none" || style.text_edge === "outline" ? style.text_edge : "shadow";
  document.body.classList.add("overlay-text-edge--" + edge);
  document.body.classList.toggle(
    "overlay-has-panel",
    (typeof style.panel_opacity === "number" && style.panel_opacity > 0) ||
      Boolean(style.panel_image) ||
      (typeof style.border_width === "number" && style.border_width > 0)
  );
  const panelImageFit = normalizePanelImageFit(style.panel_image_fit);
  const panelImageScope = normalizePanelImageScope(style.panel_image_scope, overlayView.theme);
  document.body.classList.remove(
    "overlay-panel-image-fit--cover",
    "overlay-panel-image-fit--contain",
    "overlay-panel-image-fit--fill",
    "overlay-panel-image-fit--tile"
  );
  document.body.classList.add("overlay-panel-image-fit--" + panelImageFit);
  document.body.classList.remove(
    "overlay-panel-image-scope--message",
    "overlay-panel-image-scope--column"
  );
  document.body.classList.add("overlay-panel-image-scope--" + panelImageScope);
  PREVIEW_BACKGROUND_CLASSES.forEach(function (cls) {
    document.documentElement.classList.remove(cls);
    document.body.classList.remove(cls);
  });
  if (previewEnabled) {
    const previewClass =
      "overlay-preview--" + normalizePreviewBackground(params.get("preview_background"));
    document.documentElement.classList.add(previewClass);
    document.body.classList.add(previewClass);
  }
}

function applyServerOverlayConfig(serverOverlay) {
  if (!serverOverlay || typeof serverOverlay !== "object") {
    return;
  }
  overlayAssetsRevision = Date.now();
  overlayView = alertViewFromConfig({ overlay: serverOverlay }, params);
}

function clearSplash() {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (root) {
    root.textContent = "";
  }
}

function accentIdentity(name) {
  const display = typeof name === "string" ? name : "";
  return { user: display, username: display, display_name: display };
}

function playSound(sound) {
  ensureAudioContext(audioCtx)
    .then(function (ctx) {
      audioCtx = ctx;
      scheduleAlertSound(ctx, sound);
    })
    .catch(function () {
      /* autoplay policy */
    });
}

function showSplash(alert) {
  if (!root) {
    return;
  }

  clearSplash();
  const splash = createAlertSplash(document, alert, {
    reducedMotion,
    userAccent: function (name) {
      return userAccent(accentIdentity(name));
    },
  });

  root.append(splash);
  if (!reducedMotion) {
    window.requestAnimationFrame(function () {
      splash.classList.add("alert-splash--visible");
    });
  } else {
    splash.classList.add("alert-splash--visible");
  }

  const durationMs =
    typeof alert.duration_ms === "number" && alert.duration_ms > 0
      ? alert.duration_ms
      : DEFAULT_DURATION_MS;

  hideTimer = startSplashLifecycle({
    playSound: function () {
      return playSound(alert.sound);
    },
    durationMs,
    keepVisible: samplePreviewEnabled,
    setTimeout: window.setTimeout.bind(window),
    onComplete: function () {
      clearSplash();
      const next = scheduler.completeVisible();
      if (next) {
        showSplash(next);
      }
    },
  });
}

function enqueueAlert(alert) {
  const next = scheduler.enqueue(alert);
  if (next) {
    showSplash(next);
  }
}

function handleSocketMessage(event) {
  let frame;
  try {
    frame = JSON.parse(event.data);
  } catch {
    return;
  }
  if (!frame || typeof frame !== "object") {
    return;
  }
  if (frame.type === "overlay_settings") {
    if (frame.overlay) {
      applyServerOverlayConfig(frame.overlay);
      applyAppearance();
    }
    return;
  }
  if (frame.type !== "alert") {
    return;
  }
  enqueueAlert(frame);
}

function connect() {
  if (!shouldRun || samplePreviewEnabled) {
    return;
  }
  socket = new WebSocket(wsURL());
  socket.addEventListener("open", function () {
    reconnectDelayMs = INITIAL_RECONNECT_MS;
  });
  socket.addEventListener("message", handleSocketMessage);
  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", function () {
    socket.close();
  });
}

function scheduleReconnect() {
  if (!shouldRun || samplePreviewEnabled) {
    return;
  }
  if (reconnectTimer !== null) {
    return;
  }
  reconnectTimer = window.setTimeout(function () {
    reconnectTimer = null;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_MS);
    connect();
  }, reconnectDelayMs);
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    applyServerOverlayConfig(payload && payload.overlay);
  } catch {
    /* keep defaults */
  }
  applyAppearance();
}

applyAppearance();
if (samplePreviewEnabled) {
  loadServerConfig().then(function () {
    showSplash(SAMPLE_ALERT);
  });
} else {
  loadServerConfig();
  connect();
}

window.addEventListener("beforeunload", function () {
  shouldRun = false;
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
  }
  if (socket) {
    socket.close();
  }
});

document.addEventListener("pointerdown", function () {
  ensureAudioContext(audioCtx)
    .then(function (ctx) {
      audioCtx = ctx;
    })
    .catch(function () {
      /* ignore */
    });
});
