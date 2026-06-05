(function () {
  "use strict";

  const DEFAULT_MAX_MESSAGES = 30;
  const DEFAULT_MESSAGE_TTL_SECONDS = 20;
  const DEFAULT_FONT_SIZE_PX = 18;
  const DEFAULT_DISPLAY_MODE = "normal";
  const DEFAULT_THEME = "default";
  const DISPLAY_MODES = new Set(["normal", "compact"]);
  const THEMES = new Set(["default", "dashboard"]);
  const INITIAL_RECONNECT_MS = 1000;
  const MAX_RECONNECT_MS = 30000;
  const LEAVE_ANIMATION_MS = 220;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const params = new URLSearchParams(window.location.search);

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
    if (!Number.isFinite(value) || value < 12 || value > 32) {
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

  function applyServerOverlayConfig(serverOverlay) {
    if (!serverOverlay || typeof serverOverlay !== "object") {
      return;
    }
    if (
      !params.has("max_messages") &&
      typeof serverOverlay.max_messages === "number" &&
      serverOverlay.max_messages >= 1
    ) {
      config.maxMessages = serverOverlay.max_messages;
    }
    if (
      !params.has("message_ttl_seconds") &&
      typeof serverOverlay.message_ttl_seconds === "number" &&
      serverOverlay.message_ttl_seconds >= 0
    ) {
      config.messageTTLSeconds = serverOverlay.message_ttl_seconds;
    }
    if (
      !params.has("font_size_px") &&
      typeof serverOverlay.font_size_px === "number" &&
      serverOverlay.font_size_px >= 12 &&
      serverOverlay.font_size_px <= 32
    ) {
      config.fontSizePx = serverOverlay.font_size_px;
    }
    if (!params.has("display_mode") && typeof serverOverlay.display_mode === "string") {
      const mode = serverOverlay.display_mode.trim().toLowerCase();
      if (DISPLAY_MODES.has(mode)) {
        config.displayMode = mode;
      }
    }
    if (!params.has("theme") && typeof serverOverlay.theme === "string") {
      const theme = serverOverlay.theme.trim().toLowerCase();
      if (THEMES.has(theme)) {
        config.theme = theme;
      }
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
    document.documentElement.style.setProperty(
      "--overlay-font-size",
      String(config.fontSizePx) + "px"
    );
    document.documentElement.style.setProperty(
      "--overlay-image-preview-max-width",
      String(config.imagePreviews.maxWidthPx) + "px"
    );
    document.documentElement.style.setProperty(
      "--overlay-image-preview-max-height",
      String(config.imagePreviews.maxHeightPx) + "px"
    );
    document.body.classList.remove("overlay--normal", "overlay--compact");
    document.body.classList.add(
      config.displayMode === "compact" ? "overlay--compact" : "overlay--normal"
    );
    document.body.classList.remove("overlay-theme--default", "overlay-theme--dashboard");
    document.body.classList.add(
      config.theme === "dashboard" ? "overlay-theme--dashboard" : "overlay-theme--default"
    );
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
    return;
  }

  applyAppearance();

  /** @type {Array<{ el: HTMLElement, ttlTimer: number | null }>} */
  const entries = [];
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

  function scrollToBottom() {
    window.requestAnimationFrame(function () {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
  }

  function readFragmentText(fragment) {
    return typeof fragment.text === "string" ? fragment.text : "";
  }

  function safeImageURL(rawURL) {
    if (typeof rawURL !== "string" || rawURL.trim() === "") {
      return "";
    }
    try {
      const url = new URL(rawURL, window.location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }
      return url.href;
    } catch {
      return "";
    }
  }

  function replaceBrokenImageWithText(img, text) {
    img.addEventListener(
      "error",
      function () {
        const fallback = document.createTextNode(text);
        img.replaceWith(fallback);
      },
      { once: true }
    );
  }

  function appendImageLinkFragment(el, fragment) {
    const text = readFragmentText(fragment);
    if (!config.imagePreviews.enabled) {
      appendText(el, text);
      return;
    }

    const url = safeImageURL(fragment.url);
    if (url === "" || !isPreviewImageURL(url)) {
      appendText(el, text);
      return;
    }

    const img = document.createElement("img");
    img.className = "message__image-preview";
    img.src = url;
    img.alt = "chat image";
    img.title = text;
    img.decoding = "async";
    img.loading = "lazy";
    img.draggable = false;
    img.referrerPolicy = "no-referrer";
    replaceBrokenImageWithText(img, text);
    el.appendChild(img);
  }

  function appendEmoteFragment(el, fragment) {
    const text = readFragmentText(fragment);
    const url = safeImageURL(fragment.url);
    if (url === "") {
      appendText(el, text);
      return;
    }

    const img = document.createElement("img");
    img.className = "message__emote";
    img.src = url;
    img.alt = text;
    img.title = text;
    img.decoding = "async";
    img.draggable = false;
    img.referrerPolicy = "no-referrer";
    replaceBrokenImageWithText(img, text);
    el.appendChild(img);
  }

  function appendFragment(el, fragment) {
    if (!fragment || typeof fragment !== "object") {
      return;
    }

    const type = typeof fragment.type === "string" ? fragment.type : "";
    if (type === "text") {
      appendText(el, readFragmentText(fragment));
      return;
    }
    if (type === "emote") {
      appendEmoteFragment(el, fragment);
      return;
    }
    if (type === "image_link") {
      appendImageLinkFragment(el, fragment);
      return;
    }

    appendText(el, readFragmentText(fragment));
  }

  function appendMessageContent(el, frame, fallbackText) {
    if (!Array.isArray(frame.fragments) || frame.fragments.length === 0) {
      appendText(el, fallbackText);
      return;
    }

    const before = el.childNodes.length;
    frame.fragments.forEach(function (fragment) {
      appendFragment(el, fragment);
    });
    if (el.childNodes.length === before) {
      appendText(el, fallbackText);
    }
  }

  function hasFragments(frame) {
    return Array.isArray(frame.fragments) && frame.fragments.length > 0;
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

  function renderMessage(frame) {
    if (frame.type !== "message") {
      return;
    }

    const user =
      typeof frame.display_name === "string" && frame.display_name !== ""
        ? frame.display_name
        : typeof frame.user === "string"
          ? frame.user
          : "";
    const text = typeof frame.message === "string" ? frame.message : "";
    if (user === "" && text === "" && !hasFragments(frame)) {
      return;
    }

    const row = document.createElement("div");
    row.className = "message";
    if (typeof frame.platform === "string" && frame.platform !== "") {
      row.dataset.platform = frame.platform;
    }

    const platformEl = document.createElement("span");
    platformEl.className = "message__platform";
    appendPlatformIcon(platformEl, frame.platform);

    const userEl = document.createElement("span");
    userEl.className = "message__user";
    appendText(userEl, user !== "" ? user : "?");

    const textEl = document.createElement("span");
    textEl.className = "message__text";
    appendMessageContent(textEl, frame, text);

    row.appendChild(platformEl);
    row.appendChild(userEl);
    row.appendChild(textEl);
    listEl.appendChild(row);

    let ttlTimer = null;
    if (config.messageTTLSeconds > 0) {
      ttlTimer = window.setTimeout(function () {
        removeEntryElement(row, true);
      }, config.messageTTLSeconds * 1000);
    }

    entries.push({ el: row, ttlTimer: ttlTimer });
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
    renderMessage(frame);
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

  loadServerConfig().finally(connect);
})();
