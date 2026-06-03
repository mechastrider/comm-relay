(function () {
  "use strict";

  const DEFAULT_MAX_MESSAGES = 30;
  const DEFAULT_MESSAGE_TTL_SECONDS = 20;
  const INITIAL_RECONNECT_MS = 1000;
  const MAX_RECONNECT_MS = 30000;

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

  let config = {
    maxMessages: readPositiveInt("max_messages", DEFAULT_MAX_MESSAGES),
    messageTTLSeconds: readNonNegativeInt(
      "message_ttl_seconds",
      DEFAULT_MESSAGE_TTL_SECONDS
    ),
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
  }

  const listEl = document.getElementById("messages");
  if (!listEl) {
    return;
  }

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

  function removeEntry(index) {
    const entry = entries[index];
    if (!entry) {
      return;
    }
    if (entry.ttlTimer !== null) {
      window.clearTimeout(entry.ttlTimer);
    }
    entry.el.remove();
    entries.splice(index, 1);
  }

  function trimToLimit() {
    while (entries.length > config.maxMessages) {
      removeEntry(0);
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
        const idx = entries.findIndex(function (entry) {
          return entry.el === row;
        });
        if (idx !== -1) {
          removeEntry(idx);
        }
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
