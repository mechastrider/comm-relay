import { appendText, createChatRender, safeImageURL } from "/shared/chat-render.js?v=12";
import {
  fontStack,
  hexToRgba,
  normalizePanelImageFit,
  normalizePanelImageScope,
  normalizePreviewBackground,
  overlayAssetURL,
  overlayViewFromConfig
} from "/overlay/overlay-settings.js?v=3";

"use strict";

  const DEFAULT_MAX_MESSAGES = 30;
  const DEFAULT_MESSAGE_TTL_SECONDS = 20;
  const DEFAULT_FONT_SIZE_PX = 18;
  const OVERLAY_FONT_SIZE_MIN = 12;
  const OVERLAY_FONT_SIZE_MAX = 48;
  const DEFAULT_DISPLAY_MODE = "normal";
  const DEFAULT_THEME = "default";
  const DISPLAY_MODES = new Set(["normal", "compact"]);
  const THEMES = new Set(["default", "dashboard", "cockpit_panel", "cockpit_popups", "g_rebels_popups"]);
  const INITIAL_RECONNECT_MS = 1000;
  const MAX_RECONNECT_MS = 30000;
  const LEAVE_ANIMATION_MS = 220;
  const SAMPLE_PREVIEW_MESSAGE_STAGGER_MS = 650;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const params = new URLSearchParams(window.location.search);
  const samplePreviewEnabled = params.get("preview") === "sample";
  const previewEnabled = params.has("preview");

  function readPositiveInt(name, fallback) {
    const raw = params.get(name);
    if (raw === null || raw === "") {
      return fallback;
    }
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 1) {
      return fallback;
    }
    return value;
  }

  function readNonNegativeInt(name, fallback) {
    const raw = params.get(name);
    if (raw === null || raw === "") {
      return fallback;
    }
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 0) {
      return fallback;
    }
    return value;
  }

  function readFontSizePx(fallback) {
    const raw = params.get("font_size_px");
    if (raw === null || raw === "") {
      return fallback;
    }
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value < OVERLAY_FONT_SIZE_MIN || value > OVERLAY_FONT_SIZE_MAX) {
      return fallback;
    }
    return value;
  }

  function readDisplayMode(fallback) {
    const raw = params.get("display_mode");
    if (raw === null || raw === "") {
      return fallback;
    }
    const mode = raw.trim().toLowerCase();
    if (!DISPLAY_MODES.has(mode)) {
      return fallback;
    }
    return mode;
  }

  function readTheme(fallback) {
    const raw = params.get("theme");
    if (raw === null || raw === "") {
      return fallback;
    }
    const theme = raw.trim().toLowerCase();
    if (!THEMES.has(theme)) {
      return fallback;
    }
    return theme;
  }

  const DEFAULT_IMAGE_PREVIEW_MAX_WIDTH = 320;
  const DEFAULT_IMAGE_PREVIEW_MAX_HEIGHT = 180;

  let config = {
    maxMessages: readPositiveInt("max_messages", DEFAULT_MAX_MESSAGES),
    messageTTLSeconds: readNonNegativeInt(
      "message_ttl_seconds",
      DEFAULT_MESSAGE_TTL_SECONDS
    ),
    fontSizePx: readFontSizePx(DEFAULT_FONT_SIZE_PX),
    displayMode: readDisplayMode(DEFAULT_DISPLAY_MODE),
    theme: readTheme(DEFAULT_THEME),
    imagePreviews: {
      enabled: false,
      allowedHosts: [],
      maxWidthPx: DEFAULT_IMAGE_PREVIEW_MAX_WIDTH,
      maxHeightPx: DEFAULT_IMAGE_PREVIEW_MAX_HEIGHT,
    },
  };
  let overlayView = overlayViewFromConfig({ overlay: null }, params);
  let overlayAssetsRevision = Date.now();
  let restyleRenderedMessages = function () {};

  function applyServerOverlayConfig(serverOverlay) {
    if (!serverOverlay || typeof serverOverlay !== "object") {
      return;
    }
    overlayAssetsRevision = Date.now();
    overlayView = overlayViewFromConfig({ overlay: serverOverlay }, params);
    if (!params.has("max_messages") && overlayView.max_messages >= 1) {
      config.maxMessages = overlayView.max_messages;
    }
    if (!params.has("message_ttl_seconds") && overlayView.message_ttl_seconds >= 0) {
      config.messageTTLSeconds = overlayView.message_ttl_seconds;
    }
    if (
      !params.has("font_size_px") &&
      overlayView.font_size_px >= OVERLAY_FONT_SIZE_MIN &&
      overlayView.font_size_px <= OVERLAY_FONT_SIZE_MAX
    ) {
      config.fontSizePx = overlayView.font_size_px;
    }
    if (!params.has("display_mode") && DISPLAY_MODES.has(overlayView.display_mode)) {
      config.displayMode = overlayView.display_mode;
    }
    if (!params.has("theme") && THEMES.has(overlayView.theme)) {
      config.theme = overlayView.theme;
    }
    if (
      serverOverlay.image_previews &&
      typeof serverOverlay.image_previews === "object"
    ) {
      applyServerImagePreviewConfig(serverOverlay.image_previews);
    }
  }

  function normalizeAllowedHosts(hosts) {
    if (!Array.isArray(hosts)) {
      return [];
    }
    return hosts
      .map(function (host) {
        return typeof host === "string" ? host.trim().toLowerCase() : "";
      })
      .filter(function (host) {
        return host !== "";
      });
  }

  function applyServerImagePreviewConfig(imagePreviews) {
    if (typeof imagePreviews.enabled === "boolean") {
      config.imagePreviews.enabled = imagePreviews.enabled;
    }
    if (Array.isArray(imagePreviews.allowed_hosts)) {
      config.imagePreviews.allowedHosts = normalizeAllowedHosts(
        imagePreviews.allowed_hosts
      );
    }
    if (
      typeof imagePreviews.max_width_px === "number" &&
      imagePreviews.max_width_px >= 32
    ) {
      config.imagePreviews.maxWidthPx = imagePreviews.max_width_px;
    }
    if (
      typeof imagePreviews.max_height_px === "number" &&
      imagePreviews.max_height_px >= 32
    ) {
      config.imagePreviews.maxHeightPx = imagePreviews.max_height_px;
    }
  }

  function hostAllowed(hostname) {
    const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
    if (host === "" || config.imagePreviews.allowedHosts.length === 0) {
      return false;
    }
    return config.imagePreviews.allowedHosts.some(function (allowed) {
      return host === allowed || host.endsWith("." + allowed);
    });
  }

  function isPreviewImageURL(rawURL) {
    if (typeof rawURL !== "string" || rawURL.trim() === "") {
      return false;
    }
    try {
      const url = new URL(rawURL, window.location.href);
      if (url.protocol !== "https:") {
        return false;
      }
      if (url.username !== "" || url.password !== "") {
        return false;
      }
      if (url.port !== "" && url.port !== "443") {
        return false;
      }
      const path = url.pathname.toLowerCase();
      if (!/\.(png|jpe?g|gif|webp|avif)$/.test(path)) {
        return false;
      }
      return hostAllowed(url.hostname);
    } catch {
      return false;
    }
  }

  function applyAppearance() {
    const style = overlayView.style || {};
    document.documentElement.style.setProperty(
      "--overlay-font-size",
      String(config.fontSizePx) + "px"
    );
    document.documentElement.style.setProperty(
      "--overlay-line-height",
      String(style.line_height || 1.35)
    );
    document.documentElement.style.setProperty(
      "--overlay-font-family",
      fontStack(style.font_family)
    );
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
        ? "url(\"" + overlayAssetURL(style.panel_image, overlayAssetsRevision) + "\")"
        : "none"
    );
    document.documentElement.style.setProperty(
      "--overlay-border-width",
      String(style.border_width || 0) + "px"
    );
    document.documentElement.style.setProperty(
      "--overlay-border-color",
      style.border_color || "#ffffff"
    );
    document.documentElement.style.setProperty(
      "--overlay-border-radius",
      String(style.border_radius || 0) + "px"
    );
    document.documentElement.style.setProperty(
      "--overlay-image-preview-max-width",
      String(config.imagePreviews.maxWidthPx) + "px"
    );
    document.documentElement.style.setProperty(
      "--overlay-image-preview-max-height",
      String(config.imagePreviews.maxHeightPx) + "px"
    );
    document.body.style.fontFamily = fontStack(style.font_family);
    document.body.classList.remove("overlay--normal", "overlay--compact");
    document.body.classList.add(
      config.displayMode === "compact" ? "overlay--compact" : "overlay--normal"
    );
    document.body.classList.remove(
      "overlay-theme--default",
      "overlay-theme--dashboard",
      "overlay-theme--cockpit-panel",
      "overlay-theme--cockpit-popups",
      "overlay-theme--g-rebels-popups"
    );
    document.body.classList.add("overlay-theme--" + config.theme.replace(/_/g, "-"));
    document.body.classList.remove(
      "overlay-platform-marker--stripe",
      "overlay-platform-marker--icon",
      "overlay-platform-marker--both",
      "overlay-platform-marker--none"
    );
    const marker =
      style.platform_marker === "icon" ||
      style.platform_marker === "both" ||
      style.platform_marker === "none"
        ? style.platform_marker
        : "stripe";
    document.body.classList.add("overlay-platform-marker--" + marker);
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
    const panelImageScope = normalizePanelImageScope(style.panel_image_scope, config.theme);
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
    const previewBackgroundClasses = [
      "overlay-preview--white",
      "overlay-preview--checker",
      "overlay-preview--scene",
      "overlay-preview--dark",
      "overlay-preview--busy"
    ];
    previewBackgroundClasses.forEach(function (cls) {
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

  const listEl = document.getElementById("messages");
  if (!listEl) {
    console.error("CommRelay overlay: #messages element is missing");
  } else {
    initOverlay(listEl);
  }

  function initOverlay(listEl) {
  applyAppearance();

  /** @type {Array<{ el: HTMLElement, ttlTimer: number | null, messageKey: string }>} */
  const entries = [];
  const renderedMessageIDs = new Set();
  let reconnectDelayMs = INITIAL_RECONNECT_MS;
  let reconnectTimer = null;
  let socket = null;
  let shouldRun = true;

  function wsURL() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.host + "/ws";
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
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

  function removeEntryElement(el, animate) {
    const idx = entries.findIndex(function (entry) {
      return entry.el === el;
    });
    if (idx === -1) {
      return;
    }
    removeEntry(idx, animate !== false);
  }

  function removeEntry(index, animate) {
    const entry = entries[index];
    if (!entry) {
      return;
    }
    if (entry.ttlTimer !== null) {
      window.clearTimeout(entry.ttlTimer);
      entry.ttlTimer = null;
    }
    if (entry.messageKey !== "") {
      renderedMessageIDs.delete(entry.messageKey);
    }

    if (animate) {
      entry.el.classList.add("message--leaving");
      window.setTimeout(function () {
        entry.el.remove();
        const currentIdx = entries.findIndex(function (item) {
          return item.el === entry.el;
        });
        if (currentIdx !== -1) {
          entries.splice(currentIdx, 1);
        }
      }, LEAVE_ANIMATION_MS);
      entries.splice(index, 1);
      return;
    }

    entry.el.remove();
    entries.splice(index, 1);
  }

  function trimToLimit() {
    while (entries.length > config.maxMessages) {
      removeEntry(0, true);
    }
  }

  function rememberRenderedMessage(frame) {
    const key = messageKey(frame);
    if (key !== "") {
      renderedMessageIDs.add(key);
    }
  }

  function messageKey(frame) {
    if (!frame || typeof frame.id !== "string" || frame.id === "") {
      return "";
    }
    const platform = typeof frame.platform === "string" ? frame.platform : "";
    return platform + "\0" + frame.id;
  }

  function hasRenderedMessage(frame) {
    return Boolean(
      frame &&
        typeof frame.id === "string" &&
        frame.id !== "" &&
        renderedMessageIDs.has(messageKey(frame))
    );
  }

  function removeMessage(frame) {
    const key = messageKey(frame);
    if (key === "") {
      return;
    }
    const matching = entries.filter(function (entry) {
      return entry.messageKey === key;
    });
    matching.forEach(function (entry) {
      removeEntryElement(entry.el, true);
    });
    renderedMessageIDs.delete(key);
  }

  function messageTTLMilliseconds(frame) {
    if (config.messageTTLSeconds <= 0) {
      return null;
    }

    const ttlMs = config.messageTTLSeconds * 1000;
    if (!frame || typeof frame.timestamp !== "string" || frame.timestamp === "") {
      return ttlMs;
    }

    const publishedAt = Date.parse(frame.timestamp);
    if (!Number.isFinite(publishedAt)) {
      return ttlMs;
    }

    return Math.max(0, ttlMs - (Date.now() - publishedAt));
  }

  function scrollToBottom() {
    window.requestAnimationFrame(function () {
      listEl.scrollTop = listEl.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  const chatRender = createChatRender({
    classes: {
      emote: "message__emote",
      imagePreview: "message__image-preview",
      avatar: "message__avatar",
    },
    usernameField: "user",
    imagePreviewEnabled: function () {
      return config.imagePreviews.enabled;
    },
    resolvePreviewURL: function (rawURL) {
      const url = safeImageURL(rawURL);
      if (url === "" || !isPreviewImageURL(url)) {
        return "";
      }
      return url;
    },
  });

  const {
    appendMessageContent,
    buildAvatarImage,
    messageDisplayName,
    userAccent,
  } = chatRender;

  function hasFragments(frame) {
    return Array.isArray(frame.fragments) && frame.fragments.length > 0;
  }

  function buildHiddenAvatarPlaceholder() {
    const avatar = document.createElement("span");
    avatar.className = "message__avatar";
    avatar.setAttribute("aria-hidden", "true");
    return avatar;
  }

  function cockpitThemeEnabled() {
    return config.theme === "cockpit_panel" || config.theme === "cockpit_popups" || config.theme === "g_rebels_popups";
  }

  function normalizePlatform(platform) {
    return typeof platform === "string" && platform !== ""
      ? platform.trim().toLowerCase()
      : "chat";
  }

  function createSVGPath(d) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    return path;
  }

  function createSVGRect(attrs) {
    const rect = document.createElementNS(SVG_NS, "rect");
    Object.keys(attrs).forEach(function (key) {
      rect.setAttribute(key, attrs[key]);
    });
    return rect;
  }

  function createSVGText(text) {
    const textEl = document.createElementNS(SVG_NS, "text");
    textEl.setAttribute("x", "12");
    textEl.setAttribute("y", "15.5");
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("font-size", "7");
    textEl.setAttribute("font-weight", "800");
    textEl.setAttribute("font-family", "Arial, sans-serif");
    appendText(textEl, text);
    return textEl;
  }

  function appendPlatformIcon(el, platform) {
    const name = normalizePlatform(platform);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    if (name === "youtube") {
      svg.appendChild(createSVGRect({ x: "3", y: "6", width: "18", height: "12", rx: "3" }));
      svg.appendChild(createSVGPath("M10 9.2v5.6L15 12z"));
    } else if (name === "twitch") {
      svg.appendChild(createSVGPath("M5 4h16v11.5L16.5 20H12l-3 3v-3H5z"));
      svg.appendChild(createSVGRect({ x: "10", y: "8", width: "2", height: "5", rx: "0.5" }));
      svg.appendChild(createSVGRect({ x: "15", y: "8", width: "2", height: "5", rx: "0.5" }));
    } else if (name === "vk") {
      svg.appendChild(createSVGPath("M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"));
      svg.appendChild(createSVGText("VK"));
    } else {
      svg.appendChild(createSVGPath("M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"));
      svg.appendChild(createSVGPath("M8 11h8v2H8z"));
    }

    el.title = name;
    el.setAttribute("aria-label", name);
    el.appendChild(svg);
  }

  function fillMessageRow(row, frame) {
    const user = messageDisplayName(frame);
    const text = typeof frame.message === "string" ? frame.message : "";

    row.className = "message";
    if (typeof frame.platform === "string" && frame.platform !== "") {
      row.dataset.platform = frame.platform;
    } else {
      delete row.dataset.platform;
    }
    row.style.setProperty("--message-accent", userAccent(frame));
    row.replaceChildren();

    const platformEl = document.createElement("span");
    platformEl.className = "message__platform";
    appendPlatformIcon(platformEl, frame.platform);

    const avatarEl = cockpitThemeEnabled()
      ? buildAvatarImage(frame)
      : buildHiddenAvatarPlaceholder();

    const accentEl = document.createElement("span");
    accentEl.className = "message__accent";
    accentEl.setAttribute("aria-hidden", "true");

    const identityEl = document.createElement("span");
    identityEl.className = "message__identity";
    const userEl = document.createElement("span");
    userEl.className = "message__user";
    appendText(userEl, user);
    identityEl.appendChild(platformEl);
    identityEl.appendChild(userEl);

    const textEl = document.createElement("span");
    textEl.className = "message__text";
    appendMessageContent(textEl, frame, text);

    row.appendChild(avatarEl);
    row.appendChild(accentEl);
    row.appendChild(identityEl);
    row.appendChild(textEl);
  }

  function restyleVisibleMessages() {
    entries.forEach(function (entry) {
      if (entry.frame) {
        fillMessageRow(entry.el, entry.frame);
      }
    });
    trimToLimit();
  }

  restyleRenderedMessages = restyleVisibleMessages;

  function renderMessage(frame, options) {
    if (frame.type !== "message") {
      return;
    }
    if (hasRenderedMessage(frame)) {
      return;
    }

    const user = messageDisplayName(frame);
    const text = typeof frame.message === "string" ? frame.message : "";
    if (user === "?" && text === "" && !hasFragments(frame)) {
      return;
    }
    const renderOptions = options || {};
    const ttlMs = Object.prototype.hasOwnProperty.call(renderOptions, "ttlMs")
      ? renderOptions.ttlMs
      : messageTTLMilliseconds(frame);
    if (ttlMs === 0) {
      return;
    }

    const row = document.createElement("div");
    fillMessageRow(row, frame);
    listEl.appendChild(row);

    let ttlTimer = null;
    if (ttlMs !== null && ttlMs > 0) {
      ttlTimer = window.setTimeout(function () {
        removeEntryElement(row, true);
      }, ttlMs);
    }

    rememberRenderedMessage(frame);
    entries.push({
      el: row,
      ttlTimer: ttlTimer,
      messageKey: messageKey(frame),
      frame: frame,
    });
    trimToLimit();
    scrollToBottom();
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
      restyleRenderedMessages();
      return;
    }
    if (frame.type === "message_deleted") {
      removeMessage(frame);
      return;
    }
    renderMessage(frame);
  }

  function recentMessageToFrame(msg) {
    if (!msg || typeof msg !== "object") {
      return null;
    }
    const username = typeof msg.username === "string" ? msg.username : "";
    const displayName = typeof msg.display_name === "string" ? msg.display_name : "";
    return {
      type: "message",
      id: typeof msg.id === "string" ? msg.id : "",
      platform: typeof msg.platform === "string" ? msg.platform : "",
      user: displayName || username,
      username: username,
      message: typeof msg.message === "string" ? msg.message : "",
      display_name: displayName,
      avatar_url: typeof msg.avatar_url === "string" ? msg.avatar_url : "",
      fragments: Array.isArray(msg.fragments) ? msg.fragments : [],
      timestamp: typeof msg.timestamp === "string" ? msg.timestamp : "",
    };
  }

  async function loadRecentMessages() {
    try {
      const limit = encodeURIComponent(String(config.maxMessages));
      const response = await fetch("/api/messages/recent?limit=" + limit);
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const messages = payload && Array.isArray(payload.messages) ? payload.messages : [];
      messages.forEach(function (msg) {
        const frame = recentMessageToFrame(msg);
        if (!frame) {
          return;
        }
        renderMessage(frame, { ttlMs: messageTTLMilliseconds(frame) });
      });
    } catch {
      /* keep overlay live even if history restore fails */
    }
  }

  function renderSamplePreview() {
    const messages = [
      {
        type: "message",
        id: "preview-twitch",
        platform: "twitch",
        user: "nova_pilot",
        display_name: "Nova Pilot",
        message: "Проверяем связь — текст хорошо читается поверх игры.",
      },
      {
        type: "message",
        id: "preview-youtube",
        platform: "youtube",
        user: "long_range_commander",
        display_name: "Long Range Commander",
        message: "A longer message wraps onto another line without hiding the newest chat activity.",
      },
      {
        type: "message",
        id: "preview-vk",
        platform: "vk",
        user: "mech_operator",
        display_name: "Мех Оператор",
        message: "HUD стабилен. Можно начинать миссию!",
      },
      {
        type: "message",
        id: "preview-relay",
        platform: "chat",
        user: "commrelay",
        display_name: "CommRelay",
        message: "Sample preview uses the same renderer as the OBS Browser Source.",
      },
    ];

    messages.forEach(function (frame, index) {
      window.setTimeout(function () {
        renderMessage(frame, { ttlMs: null });
      }, index * SAMPLE_PREVIEW_MESSAGE_STAGGER_MS);
    });
  }

  function connect() {
    clearReconnectTimer();
    if (!shouldRun) {
      return;
    }

    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
      socket = null;
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

  window.addEventListener("beforeunload", function () {
    shouldRun = false;
    clearReconnectTimer();
    if (socket) {
      socket.close();
    }
  });

  if (samplePreviewEnabled) {
    loadServerConfig().finally(renderSamplePreview);
  } else {
    loadServerConfig().then(loadRecentMessages).finally(connect);
  }
}
