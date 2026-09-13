"use strict";

import { fontStack, normalizePreviewBackground, panelBackground, recapViewFromConfig } from "/overlay/overlay-settings.js?v=1";
import { normalizeRecapSnapshot, SAMPLE_RECAP, visibleRecapFromFrame } from "./recap-model.js?v=1";
import { renderRecap } from "./recap-render.js?v=1";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const THEME_CLASSES = ["default", "dashboard", "cockpit-panel", "cockpit-popups", "g-rebels-popups"];
const params = new URLSearchParams(window.location.search);
const sampleMode = params.get("preview") === "sample";
const root = document.getElementById("recap-root");
let view = recapViewFromConfig({ overlay: null }, params);
let socket = null;
let reconnectTimer = null;
let reconnectDelay = INITIAL_RECONNECT_MS;
let visibleSnapshot = null;

function applyAppearance() {
  const style = view.style || {};
  document.documentElement.style.setProperty("--recap-panel-bg", panelBackground(view.theme, style));
  document.documentElement.style.setProperty("--recap-font", fontStack(style.font_family));
  document.documentElement.style.setProperty("--recap-border", style.border_color || "#ffffff");
  document.documentElement.style.setProperty("--recap-border-width", String(style.border_width || 0) + "px");
  document.documentElement.style.setProperty("--recap-radius", String(style.border_radius || 0) + "px");
  THEME_CLASSES.forEach(function (name) { document.body.classList.remove("overlay-theme--" + name); });
  document.body.classList.add("overlay-theme--" + String(view.theme || "default").replace(/_/g, "-"));
  if (sampleMode) {
    document.documentElement.className = "overlay-preview--" + normalizePreviewBackground(params.get("preview_background"));
  }
}

function clearRecap() {
  visibleSnapshot = null;
  if (root) {
    root.textContent = "";
  }
}

function showRecap(snapshot) {
  if (!root || !snapshot) {
    return;
  }
  visibleSnapshot = snapshot;
  renderRecap(root, snapshot);
}

function applyFrame(frame) {
  if (frame && frame.type === "overlay_settings" && frame.overlay && typeof frame.overlay === "object") {
    view = recapViewFromConfig({ overlay: frame.overlay }, params);
    applyAppearance();
    if (visibleSnapshot) {
      renderRecap(root, visibleSnapshot);
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
    view = recapViewFromConfig(await response.json(), params);
    applyAppearance();
    if (visibleSnapshot) {
      renderRecap(root, visibleSnapshot);
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

applyAppearance();
if (sampleMode) {
  showRecap(normalizeRecapSnapshot(SAMPLE_RECAP));
} else {
  loadAppearance();
  connect();
}
