"use strict";

import {
  fontStack,
  normalizePanelImageFit,
  normalizePreviewBackground,
  overlayAssetURL,
  panelBackground,
  recapViewFromConfig,
} from "/overlay/overlay-settings.js?v=8";
import { readCachedLocale, setLocale, t } from "/shared/i18n.js?v=18";
import { normalizeRecapSnapshot, RECAP_WINDOW_SESSION, SAMPLE_RECAP, visibleRecapFromFrame } from "./recap-model.js?v=2";
import { renderRecap } from "./recap-render.js?v=3";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const THEME_CLASSES = ["default", "dashboard", "cockpit-panel", "cockpit-popups", "g-rebels-popups"];
const TEXT_EDGE_CLASSES = ["none", "shadow", "outline"];
const PANEL_IMAGE_FIT_CLASSES = ["cover", "contain", "fill", "tile"];
const params = new URLSearchParams(window.location.search);
const sampleMode = params.get("preview") === "sample";
const root = document.getElementById("recap-root");
let view = recapViewFromConfig({ overlay: null }, params);
let overlayAssetsRevision = Date.now();
let socket = null;
let reconnectTimer = null;
let reconnectDelay = INITIAL_RECONNECT_MS;
let visiblePresentation = null;

setLocale(params.get("locale") || readCachedLocale());

function applyAppearance() {
  const style = view.style || {};
  document.documentElement.style.setProperty("--recap-font-size", String(view.font_size_px || 18) + "px");
  document.documentElement.style.setProperty("--recap-line-height", String(style.line_height || 1.35));
  document.documentElement.style.setProperty("--recap-panel-bg", panelBackground(view.theme, style));
  document.documentElement.style.setProperty(
    "--recap-panel-opacity",
    String(typeof style.panel_opacity === "number" ? style.panel_opacity : 0.58)
  );
  document.documentElement.style.setProperty(
    "--recap-panel-image",
    style.panel_image
      ? 'url("' + overlayAssetURL(style.panel_image, overlayAssetsRevision) + '")'
      : "none"
  );
  document.documentElement.style.setProperty("--recap-font", fontStack(style.font_family));
  document.documentElement.style.setProperty("--recap-border", style.border_color || "#ffffff");
  document.documentElement.style.setProperty("--recap-border-width", String(style.border_width || 0) + "px");
  document.documentElement.style.setProperty("--recap-radius", String(style.border_radius || 0) + "px");
  document.documentElement.style.setProperty(
    "--recap-text-edge-strength",
    String(style.text_edge_strength || 0)
  );
  THEME_CLASSES.forEach(function (name) { document.body.classList.remove("overlay-theme--" + name); });
  document.body.classList.add("overlay-theme--" + String(view.theme || "default").replace(/_/g, "-"));
  TEXT_EDGE_CLASSES.forEach(function (name) { document.body.classList.remove("overlay-text-edge--" + name); });
  document.body.classList.add(
    "overlay-text-edge--" + (style.text_edge === "none" || style.text_edge === "outline" ? style.text_edge : "shadow")
  );
  PANEL_IMAGE_FIT_CLASSES.forEach(function (name) {
    document.body.classList.remove("recap-panel-image-fit--" + name);
  });
  document.body.classList.add("recap-panel-image-fit--" + normalizePanelImageFit(style.panel_image_fit));
  document.body.classList.toggle("recap-has-panel-image", Boolean(style.panel_image));
  document.title = t("recap.overlayDocumentTitle");
  if (sampleMode) {
    document.documentElement.className = "overlay-preview--" + normalizePreviewBackground(params.get("preview_background"));
  }
}

function clearRecap() {
  visiblePresentation = null;
  if (root) {
    root.textContent = "";
  }
}

function showRecap(presentation) {
  if (!root || !presentation || !presentation.snapshot) {
    return;
  }
  visiblePresentation = presentation;
  renderRecap(root, presentation.snapshot, presentation.window);
}

function applyFrame(frame) {
  if (frame && frame.type === "overlay_settings" && frame.overlay && typeof frame.overlay === "object") {
    view = recapViewFromConfig({ overlay: frame.overlay }, params);
    applyAppearance();
    if (visiblePresentation) {
      renderRecap(root, visiblePresentation.snapshot, visiblePresentation.window);
    }
    return;
  }
  const next = visibleRecapFromFrame(frame);
  if (next === undefined) {
    return;
  }
  if (next === null) {
    clearRecap();
    return;
  }
  showRecap(next);
}

async function loadAppearance() {
  try {
    const response = await window.fetch("/api/config");
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    setLocale(payload && payload.admin && payload.admin.time_locale);
    overlayAssetsRevision = Date.now();
    view = recapViewFromConfig(payload, params);
    applyAppearance();
    if (visiblePresentation) {
      renderRecap(root, visiblePresentation.snapshot, visiblePresentation.window);
    }
  } catch {
    // Appearance falls back to the built-in theme while the overlay reconnects.
  }
}

function websocketURL() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/ws";
}

function scheduleReconnect() {
  if (sampleMode || reconnectTimer !== null) {
    return;
  }
  const delay = reconnectDelay;
  reconnectDelay = Math.min(MAX_RECONNECT_MS, reconnectDelay * 2);
  reconnectTimer = window.setTimeout(function () {
    reconnectTimer = null;
    connect();
  }, delay);
}

function connect() {
  if (sampleMode) {
    return;
  }
  try {
    socket = new WebSocket(websocketURL());
  } catch {
    scheduleReconnect();
    return;
  }
  socket.addEventListener("open", function () { reconnectDelay = INITIAL_RECONNECT_MS; });
  socket.addEventListener("message", function (event) {
    try {
      applyFrame(JSON.parse(event.data));
    } catch {
      // Ignore malformed and unknown frames; the server's next state converges us.
    }
  });
  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", function () { socket.close(); });
}

async function start() {
  applyAppearance();
  if (sampleMode) {
    showRecap({ window: RECAP_WINDOW_SESSION, snapshot: normalizeRecapSnapshot(SAMPLE_RECAP) });
    return;
  }
  await loadAppearance();
  connect();
}

start();
