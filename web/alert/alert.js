"use strict";

import {
  fontStack,
  hexToRgba,
  normalizePanelImageFit,
  normalizePanelImageScope,
  normalizePreviewBackground,
  overlayAssetURL,
  overlayViewFromConfig,
} from "/overlay/overlay-settings.js?v=4";
import { createChatRender } from "/shared/chat-render.js?v=12";
import { ensureAudioContext, scheduleAlertSound } from "./alert-sound.js";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const MAX_QUEUE = 20;
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
let overlayView = overlayViewFromConfig({ overlay: null }, params);
let overlayAssetsRevision = Date.now();
let socket = null;
let reconnectTimer = null;
let reconnectDelayMs = INITIAL_RECONNECT_MS;
let shouldRun = true;
let audioCtx = null;
let showing = null;
let hideTimer = null;
/** @type {Array<Record<string, unknown>>} */
const queue = [];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SAMPLE_ALERT = {
  name: "Nova",
  avatar_url: "",
  text: "Good game, Nova!",
  sound: "chime",
  duration_ms: 5000,
};
const { userAccent } = createChatRender();

function wsURL() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/ws";
}

function safeImageURL(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";
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
    hexToRgba(style.panel_color, style.panel_opacity)
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
  overlayView = overlayViewFromConfig({ overlay: serverOverlay }, params);
}

function clearSplash() {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (root) {
    root.textContent = "";
  }
  showing = null;
}

function renderAvatar(name, avatarURL) {
  const safeURL = safeImageURL(avatarURL);
  if (safeURL) {
    const avatar = document.createElement("img");
    avatar.className = "alert-avatar";
    avatar.src = safeURL;
    avatar.alt = "";
    avatar.loading = "eager";
    avatar.referrerPolicy = "no-referrer";
    avatar.addEventListener(
      "error",
      function () {
        avatar.replaceWith(renderAvatar(name, ""));
      },
      { once: true }
    );
    return avatar;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "alert-avatar alert-avatar--placeholder";
  const initial = typeof name === "string" && name.trim() ? name.trim().charAt(0).toUpperCase() : "?";
  placeholder.textContent = initial;
  return placeholder;
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
  showing = alert;

  const splash = document.createElement("article");
  splash.className = "alert-splash";
  if (reducedMotion) {
    splash.classList.add("alert-splash--reduced");
  }

  const name = typeof alert.name === "string" ? alert.name : "";
  splash.style.setProperty("--message-accent", userAccent(accentIdentity(name)));

  const accent = document.createElement("span");
  accent.className = "alert-accent";
  accent.setAttribute("aria-hidden", "true");

  const text = document.createElement("p");
  text.className = "alert-text";
  text.textContent = typeof alert.text === "string" ? alert.text : "";

  splash.append(renderAvatar(name, alert.avatar_url), accent, text);

  root.append(splash);
  playSound(alert.sound);

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

  if (samplePreviewEnabled) {
    return;
  }

  hideTimer = window.setTimeout(function () {
    clearSplash();
    if (queue.length > 0) {
      showSplash(queue.shift());
    }
  }, durationMs);
}

function enqueueAlert(alert) {
  if (showing) {
    if (queue.length >= MAX_QUEUE) {
      queue.shift();
    }
    queue.push(alert);
    return;
  }
  showSplash(alert);
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
