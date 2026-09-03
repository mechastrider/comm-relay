"use strict";

import {
  fontStack,
  panelBackground,
  leaderboardViewFromConfig,
  normalizePanelImageFit,
  normalizePanelImageScope,
  normalizePreviewBackground,
  overlayAssetURL,
} from "../overlay-settings.js?v=8";
import { isOverlayDebugPage, overlayWebSocketURL } from "/shared/overlay-debug.js?v=1";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const LEADERBOARD_PERIODS = new Set(["session", "day", "all"]);
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

const SAMPLE_ENTRIES = [
  { rank: 1, display_name: "Nova", xp: 42, message_count: 18, avatar_url: "" },
  { rank: 2, display_name: "Brick", xp: 31, message_count: 14, avatar_url: "" },
  { rank: 3, display_name: "Helix", xp: 18, message_count: 9, avatar_url: "" },
  { rank: 4, display_name: "Mira", xp: 12, message_count: 6, avatar_url: "" },
  { rank: 5, display_name: "Tor", xp: 7, message_count: 4, avatar_url: "" },
];

const root = document.getElementById("leaderboard");
const params = new URLSearchParams(window.location.search);
const previewEnabled = params.has("preview");
const samplePreviewEnabled = previewEnabled;
const debugTestEnabled = isOverlayDebugPage(window.location);

function normalizePeriod(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return LEADERBOARD_PERIODS.has(value) ? value : "session";
}

const period = normalizePeriod(params.get("period"));

let overlayView = leaderboardViewFromConfig({ overlay: null }, params);
let overlayAssetsRevision = Date.now();
let socket = null;
let reconnectTimer = null;
let reconnectDelayMs = INITIAL_RECONNECT_MS;
let shouldRun = true;

function wsURL() {
  return overlayWebSocketURL(window.location);
}

function escapeText(value) {
  return String(value == null ? "" : value);
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
      ? "url(\"" + overlayAssetURL(style.panel_image, overlayAssetsRevision) + "\")"
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
  document.body.classList.add("overlay-theme--" + String(overlayView.theme || "default").replace(/_/g, "-"));
  document.body.classList.remove("leaderboard-layout--panel", "leaderboard-layout--chips");
  document.body.classList.add(
    overlayView.layout === "chips" ? "leaderboard-layout--chips" : "leaderboard-layout--panel"
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
    const previewClass = "overlay-preview--" + normalizePreviewBackground(params.get("preview_background"));
    document.documentElement.classList.add(previewClass);
    document.body.classList.add(previewClass);
  }
}

function applyServerOverlayConfig(serverOverlay) {
  if (!serverOverlay || typeof serverOverlay !== "object") {
    return;
  }
  overlayAssetsRevision = Date.now();
  overlayView = leaderboardViewFromConfig({ overlay: serverOverlay }, params);
}

function renderEntries(entries) {
  if (!root) {
    return;
  }

  root.textContent = "";
  const list = document.createElement("ol");
  list.className = "leaderboard-list";

  (entries || []).forEach(function (entry) {
    const item = document.createElement("li");
    item.className = "leaderboard-row";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(entry.rank || "");

    const body = document.createElement("div");
    body.className = "leaderboard-body";

    const nameRow = document.createElement("div");
    nameRow.className = "leaderboard-name-row";

    if (entry.avatar_url) {
      const avatar = document.createElement("img");
      avatar.className = "leaderboard-avatar";
      avatar.src = entry.avatar_url;
      avatar.alt = "";
      avatar.loading = "lazy";
      avatar.referrerPolicy = "no-referrer";
      nameRow.append(avatar);
    }

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = escapeText(entry.display_name || "—");
    nameRow.append(name);

    const stats = document.createElement("span");
    stats.className = "leaderboard-stats";
    stats.textContent = String(entry.xp || 0) + " · " + String(entry.message_count || 0) + " msg";

    body.append(nameRow, stats);
    item.append(rank, body);
    list.append(item);
  });

  root.append(list);
}

async function loadSnapshot() {
  try {
    const response = await fetch("/api/leaderboard?period=" + encodeURIComponent(period));
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    if (payload && payload.period === period && Array.isArray(payload.entries)) {
      renderEntries(payload.entries);
    }
  } catch {
    /* WebSocket may still deliver updates */
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
    applyServerOverlayConfig(frame.overlay);
    applyAppearance();
    return;
  }
  if (samplePreviewEnabled) {
    return;
  }
  if (debugTestEnabled && frame.type === "debug_reset") {
    renderEntries([]);
    return;
  }
  if (frame.type !== "leaderboard" || frame.period !== period) {
    return;
  }
  renderEntries(frame.entries);
}

function scheduleReconnect() {
  if (!shouldRun || reconnectTimer !== null) {
    return;
  }
  reconnectTimer = window.setTimeout(function () {
    reconnectTimer = null;
    connect();
  }, reconnectDelayMs);
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_MS);
}

function connect() {
  if (!shouldRun) {
    return;
  }
  socket = new WebSocket(wsURL());
  socket.addEventListener("open", function () {
    reconnectDelayMs = INITIAL_RECONNECT_MS;
  });
  socket.addEventListener("message", handleSocketMessage);
  socket.addEventListener("close", function () {
    socket = null;
    scheduleReconnect();
  });
  socket.addEventListener("error", function () {
    if (socket) {
      socket.close();
    }
  });
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
    /* keep URL/default config */
  }
  applyAppearance();
}

async function start() {
  await loadServerConfig();
  if (samplePreviewEnabled) {
    renderEntries(SAMPLE_ENTRIES);
    return;
  }
  if (!debugTestEnabled) {
    await loadSnapshot();
  }
  connect();
}

start();

window.addEventListener("beforeunload", function () {
  shouldRun = false;
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
  }
  if (socket) {
    socket.close();
  }
});
