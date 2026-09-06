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
import {
  completeRowsThatFit,
  fontSizeToFitFirstRow,
  isCompactLeaderboard,
  isLeaderboardSamplePreview,
  leaderboardFontSizeForWidth,
  shouldRenderMessageCount,
} from "./leaderboard-fit.js?v=1";

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
const samplePreviewEnabled = isLeaderboardSamplePreview(params);
const debugTestEnabled = isOverlayDebugPage(window.location);

function maxEntriesCap() {
  const cap = overlayView.max_entries;
  return Number.isFinite(cap) && cap > 0 ? cap : 5;
}

function entriesForDisplay(entries) {
  return (entries || []).slice(0, maxEntriesCap());
}

function sampleEntriesForCap(maxEntries) {
  const cap = Number.isFinite(maxEntries) && maxEntries > 0 ? maxEntries : 5;
  const rows = [];
  for (let i = 0; i < cap; i++) {
    if (i < SAMPLE_ENTRIES.length) {
      rows.push(SAMPLE_ENTRIES[i]);
      continue;
    }
    rows.push({
      rank: i + 1,
      display_name: "Sample " + String(i + 1),
      xp: Math.max(1, SAMPLE_ENTRIES.length - i + 1),
      message_count: Math.max(1, 3 - Math.floor(i / 3)),
      avatar_url: "",
    });
  }
  return rows;
}

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
let latestEntries = [];
let layoutFrame = null;
let resizeObserver = null;
let visibleRowCount = 0;
const responsiveSizingAvailable = typeof ResizeObserver === "function";

function wsURL() {
  return overlayWebSocketURL(window.location);
}

function escapeText(value) {
  return String(value == null ? "" : value);
}

function applyAppearance() {
  const style = overlayView.style || {};
  document.documentElement.style.setProperty("--overlay-font-size", resolvedBaseFontSize() + "px");
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
  renderTitle();
  scheduleLayout();
}

function resolvedBaseFontSize() {
  const fontSize = overlayView.font_size_px;
  return fontSize >= OVERLAY_FONT_SIZE_MIN && fontSize <= OVERLAY_FONT_SIZE_MAX ? fontSize : 18;
}

function renderTitle() {
  if (!root) {
    return;
  }
  let heading = root.querySelector(".leaderboard-title");
  const title = String(overlayView.title || "").trim();
  if (!title) {
    if (heading) {
      heading.remove();
    }
    return;
  }
  if (!heading) {
    heading = document.createElement("h1");
    heading.className = "leaderboard-title";
    root.insertBefore(heading, root.firstChild);
  }
  heading.textContent = title;
}

function localizedMessageCount(value) {
  const count = Number(value) || 0;
  const locale = String(navigator.language || document.documentElement.lang || "en").toLowerCase();
  return locale.startsWith("ru") ? String(count) + " сообщ." : String(count) + " messages";
}

function setLeaderboardFontSize(fontSizePx) {
  document.documentElement.style.setProperty("--leaderboard-font-size", String(fontSizePx) + "px");
  document.documentElement.style.setProperty("--leaderboard-scale", String(fontSizePx / 18));
}

function numericStyle(style, property) {
  const value = Number.parseFloat(style.getPropertyValue(property));
  return Number.isFinite(value) ? value : 0;
}

function layoutRows(allowAutoShrink) {
  if (!root) {
    return;
  }
  const rows = Array.from(root.querySelectorAll(".leaderboard-row"));
  rows.forEach(function (row) {
    row.hidden = false;
  });

  const width = root.clientWidth || window.innerWidth;
  const sizingMode = responsiveSizingAvailable ? overlayView.sizing_mode : "fixed";
  const fontSize = leaderboardFontSizeForWidth({
    sizingMode: sizingMode,
    baseFontSizePx: resolvedBaseFontSize(),
    width: width,
    layout: overlayView.layout,
  });
  setLeaderboardFontSize(fontSize);

  const compact = isCompactLeaderboard(width, fontSize);
  document.body.classList.toggle("leaderboard-density--compact", compact);
  document.body.classList.toggle(
    "leaderboard-show-messages",
    shouldRenderMessageCount(overlayView.show_message_count, compact)
  );

  const rootStyle = window.getComputedStyle(root);
  const availableHeight = Math.max(
    0,
    root.clientHeight - numericStyle(rootStyle, "padding-top") - numericStyle(rootStyle, "padding-bottom")
  );
  const title = root.querySelector(".leaderboard-title");
  let titleHeight = 0;
  if (title) {
    const titleStyle = window.getComputedStyle(title);
    titleHeight = title.getBoundingClientRect().height + numericStyle(titleStyle, "margin-bottom");
  }
  const list = root.querySelector(".leaderboard-list");
  const listStyle = list ? window.getComputedStyle(list) : null;
  const rowGap = listStyle ? numericStyle(listStyle, "row-gap") : 0;
  const rowHeights = rows.map(function (row) {
    return row.getBoundingClientRect().height;
  });
  let count = completeRowsThatFit({
    availableHeight: availableHeight,
    titleHeight: titleHeight,
    rowHeights: rowHeights,
    rowGap: rowGap,
    maxEntries: maxEntriesCap(),
    previousCount: visibleRowCount,
    hysteresisPx: 2,
  });

  if (allowAutoShrink && sizingMode === "auto" && count === 0 && rowHeights.length > 0) {
    const smaller = fontSizeToFitFirstRow({
      sizingMode: "auto",
      fontSizePx: fontSize,
      availableHeight: availableHeight,
      requiredHeight: titleHeight + rowHeights[0],
    });
    if (smaller < fontSize) {
      setLeaderboardFontSize(smaller);
      const adjustedTitleHeight = title
        ? title.getBoundingClientRect().height + numericStyle(window.getComputedStyle(title), "margin-bottom")
        : 0;
      const adjustedRowHeights = rows.map(function (row) {
        return row.getBoundingClientRect().height;
      });
      count = completeRowsThatFit({
        availableHeight: availableHeight,
        titleHeight: adjustedTitleHeight,
        rowHeights: adjustedRowHeights,
        rowGap: list ? numericStyle(window.getComputedStyle(list), "row-gap") : 0,
        maxEntries: maxEntriesCap(),
        previousCount: visibleRowCount,
        hysteresisPx: 2,
      });
    }
  }

  visibleRowCount = count;
  rows.forEach(function (row, index) {
    row.hidden = index >= count;
  });
  root.dataset.visibleRows = String(count);
  root.dataset.sizingMode = sizingMode;
}

function scheduleLayout() {
  if (layoutFrame !== null) {
    return;
  }
  layoutFrame = window.requestAnimationFrame(function () {
    layoutFrame = null;
    layoutRows(true);
  });
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

  latestEntries = entriesForDisplay(entries);
  renderTitle();
  const existingList = root.querySelector(".leaderboard-list");
  if (existingList) {
    existingList.remove();
  }
  const list = document.createElement("ol");
  list.className = "leaderboard-list";

  latestEntries.forEach(function (entry) {
    const item = document.createElement("li");
    item.className = "leaderboard-row";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(entry.rank || "");

    if (entry.avatar_url) {
      const avatar = document.createElement("img");
      avatar.className = "leaderboard-avatar";
      avatar.src = entry.avatar_url;
      avatar.alt = "";
      avatar.loading = "lazy";
      avatar.referrerPolicy = "no-referrer";
      item.append(avatar);
    } else {
      item.classList.add("leaderboard-row--without-avatar");
    }

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = escapeText(entry.display_name || "—");

    const metrics = document.createElement("span");
    metrics.className = "leaderboard-metrics";

    const xp = document.createElement("span");
    xp.className = "leaderboard-xp";
    xp.textContent = String(entry.xp || 0) + " XP";

    const messages = document.createElement("span");
    messages.className = "leaderboard-messages";
    messages.textContent = localizedMessageCount(entry.message_count);

    metrics.append(xp, messages);
    item.append(rank, name, metrics);
    list.append(item);
  });

  root.append(list);
  scheduleLayout();
}

async function loadSnapshot() {
  try {
    const limit = overlayView.max_entries || 5;
    const response = await fetch(
      "/api/leaderboard?period=" +
        encodeURIComponent(period) +
        "&limit=" +
        encodeURIComponent(String(limit))
    );
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
    if (samplePreviewEnabled) {
      renderEntries(sampleEntriesForCap(overlayView.max_entries));
    } else {
      renderEntries(latestEntries);
      void loadSnapshot();
    }
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
  if (responsiveSizingAvailable && root) {
    resizeObserver = new ResizeObserver(scheduleLayout);
    resizeObserver.observe(root);
  }
  window.addEventListener("resize", scheduleLayout);
  await loadServerConfig();
  if (samplePreviewEnabled) {
    renderEntries(sampleEntriesForCap(overlayView.max_entries));
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
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (layoutFrame !== null) {
    window.cancelAnimationFrame(layoutFrame);
  }
  window.removeEventListener("resize", scheduleLayout);
});
