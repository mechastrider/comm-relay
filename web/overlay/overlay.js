(function () {
  "use strict";

  const DEFAULT_MAX_MESSAGES = 30;
  const DEFAULT_MESSAGE_TTL_SECONDS = 20;
  const DEFAULT_FONT_SIZE_PX = 18;
  const DEFAULT_DISPLAY_MODE = "normal";
  const DISPLAY_MODES = new Set(["normal", "compact"]);
  const INITIAL_RECONNECT_MS = 1000;
  const MAX_RECONNECT_MS = 30000;
  const LEAVE_ANIMATION_MS = 220;

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

  let config = {
    maxMessages: readPositiveInt("max_messages", DEFAULT_MAX_MESSAGES),
    messageTTLSeconds: readNonNegativeInt(
      "message_ttl_seconds",
      DEFAULT_MESSAGE_TTL_SECONDS
    ),
    fontSizePx: readFontSizePx(DEFAULT_FONT_SIZE_PX),
    displayMode: readDisplayMode(DEFAULT_DISPLAY_MODE),
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
  }

  function applyAppearance() {
    document.documentElement.style.setProperty(
      "--overlay-font-size",
      String(config.fontSizePx) + "px"
    );
    document.body.classList.remove("overlay--normal", "overlay--compact");
    document.body.classList.add(
      config.displayMode === "compact" ? "overlay--compact" : "overlay--normal"
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
    if (user === "" && text === "") {
      return;
    }

    const row = document.createElement("div");
    row.className = "message";
    if (typeof frame.platform === "string" && frame.platform !== "") {
      row.dataset.platform = frame.platform;
    }

    const userEl = document.createElement("span");
    userEl.className = "message__user";
    appendText(userEl, user !== "" ? user : "?");

    const textEl = document.createElement("span");
    textEl.className = "message__text";
    appendText(textEl, text);

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
