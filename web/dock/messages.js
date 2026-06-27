(function () {
  "use strict";

  const MESSAGE_LIMIT = 100;
  const SCROLL_THRESHOLD_PX = 48;
  const INITIAL_RECONNECT_MS = 500;
  const MAX_RECONNECT_MS = 10000;

  const panel = document.getElementById("message-panel");
  const list = document.getElementById("messages");
  const emptyState = document.getElementById("empty-state");

  let messages = [];
  let socket = null;
  let reconnectTimer = null;
  let reconnectDelayMs = INITIAL_RECONNECT_MS;
  let shouldRun = true;
  let previewSettings = {
    enabled: false,
    allowed_hosts: [],
    max_width_px: 320,
    max_height_px: 180,
  };

  function appendText(element, value) {
    element.appendChild(document.createTextNode(typeof value === "string" ? value : ""));
  }

  function displayName(message) {
    if (typeof message.display_name === "string" && message.display_name !== "") {
      return message.display_name;
    }
    if (typeof message.username === "string" && message.username !== "") {
      return message.username;
    }
    return "?";
  }

  function messageKey(message) {
    const id = typeof message.id === "string" ? message.id.trim() : "";
    if (id !== "") {
      return [message.platform || "", id].join("\0");
    }
    return [
      message.platform || "",
      displayName(message),
      message.message || "",
      message.timestamp || "",
    ].join("\0");
  }

  function messageIdentity(message) {
    const platform = typeof message.platform === "string"
      ? message.platform.trim().toLowerCase()
      : "";
    const username = typeof message.username === "string"
      ? message.username.trim().toLowerCase()
      : "";
    return platform + ":" + (username || displayName(message).trim().toLowerCase());
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function userAccent(message) {
    const palette = [
      "#57d68d", "#5ec8ff", "#ffca55", "#ff8f70", "#c89cff",
      "#66e3d4", "#f06ea9", "#a5d65e", "#8ca8ff", "#f0a84f",
    ];
    return palette[hashString(messageIdentity(message)) % palette.length];
  }

  function safeImageURL(value) {
    if (typeof value !== "string" || value.trim() === "") {
      return "";
    }
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function initialsForName(name) {
    return name
      .split(/[\s._-]+/)
      .filter(function (part) { return part !== ""; })
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("") || "?";
  }

  function escapeSVGText(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function avatarFallbackURL(message) {
    const hash = hashString(messageIdentity(message));
    const accent = userAccent(message);
    const initials = escapeSVGText(initialsForName(displayName(message)));
    const backgrounds = ["#1e2d24", "#1c2b36", "#33281a", "#332022", "#2b2340"];
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="10" fill="' + backgrounds[hash % backgrounds.length] + '"/>' +
      '<circle cx="24" cy="24" r="17" fill="' + accent + '" opacity="0.82"/>' +
      '<text x="24" y="30" text-anchor="middle" font-family="Consolas,monospace" font-size="14" font-weight="700" fill="#fff">' +
      initials + "</text></svg>";
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function buildAvatar(message) {
    const avatar = document.createElement("img");
    avatar.className = "message-list__avatar";
    avatar.alt = "";
    avatar.decoding = "async";
    avatar.draggable = false;
    avatar.referrerPolicy = "no-referrer";

    const fallback = avatarFallbackURL(message);
    const url = safeImageURL(message.avatar_url);
    avatar.src = url || fallback;
    if (url !== "") {
      avatar.addEventListener("error", function () { avatar.src = fallback; }, { once: true });
    }
    return avatar;
  }

  function readFragmentText(fragment) {
    return typeof fragment.text === "string" ? fragment.text : "";
  }

  function replaceBrokenImageWithText(image, text) {
    image.addEventListener("error", function () {
      image.replaceWith(document.createTextNode(text));
    }, { once: true });
  }

  function imagePreviewHostAllowed(hostname) {
    const host = hostname.trim().toLowerCase();
    return Array.isArray(previewSettings.allowed_hosts) && previewSettings.allowed_hosts.some(function (allowed) {
      const normalized = typeof allowed === "string" ? allowed.trim().toLowerCase() : "";
      return normalized !== "" && (host === normalized || host.endsWith("." + normalized));
    });
  }

  function safePreviewURL(value) {
    if (!previewSettings.enabled || typeof value !== "string") {
      return "";
    }
    try {
      const url = new URL(value, window.location.href);
      const validPath = /\.(png|jpe?g|gif|webp|avif)$/i.test(url.pathname);
      if (url.protocol !== "https:" || url.username !== "" || url.password !== "" ||
          (url.port !== "" && url.port !== "443") || !validPath ||
          !imagePreviewHostAllowed(url.hostname)) {
        return "";
      }
      return url.href;
    } catch {
      return "";
    }
  }

  function appendFragment(element, fragment) {
    if (!fragment || typeof fragment !== "object") {
      return;
    }

    const text = readFragmentText(fragment);
    if (fragment.type === "text") {
      appendText(element, text);
      return;
    }

    if (fragment.type === "emote") {
      const url = safeImageURL(fragment.url);
      if (url === "") {
        appendText(element, text);
        return;
      }
      const image = document.createElement("img");
      image.className = "message-list__emote";
      image.src = url;
      image.alt = text;
      image.title = text;
      image.decoding = "async";
      image.draggable = false;
      image.referrerPolicy = "no-referrer";
      replaceBrokenImageWithText(image, text);
      element.appendChild(image);
      return;
    }

    if (fragment.type === "image_link") {
      const url = safePreviewURL(fragment.url);
      if (url === "") {
        appendText(element, text);
        return;
      }
      const image = document.createElement("img");
      image.className = "message-list__image-preview";
      image.src = url;
      image.alt = "chat image";
      image.title = text;
      image.decoding = "async";
      image.loading = "lazy";
      image.draggable = false;
      image.referrerPolicy = "no-referrer";
      image.style.setProperty("--preview-max-width", String(previewSettings.max_width_px || 320) + "px");
      image.style.setProperty("--preview-max-height", String(previewSettings.max_height_px || 180) + "px");
      replaceBrokenImageWithText(image, text);
      element.appendChild(image);
      return;
    }

    appendText(element, text);
  }

  function appendMessageContent(element, message) {
    const fallback = typeof message.message === "string" ? message.message : "";
    if (!Array.isArray(message.fragments) || message.fragments.length === 0) {
      appendText(element, fallback);
      return;
    }
    const before = element.childNodes.length;
    message.fragments.forEach(function (fragment) { appendFragment(element, fragment); });
    if (element.childNodes.length === before) {
      appendText(element, fallback);
    }
  }

  function formatTime(value) {
    if (typeof value !== "string" || value === "") {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function buildMessageItem(message) {
    const item = document.createElement("li");
    item.className = "message-list__item";
    item.style.setProperty("--message-accent", userAccent(message));

    const content = document.createElement("div");
    content.className = "message-list__content";
    const meta = document.createElement("div");
    meta.className = "message-list__meta";

    const user = document.createElement("span");
    user.className = "message-list__user";
    appendText(user, displayName(message));
    user.title = displayName(message);

    const platform = document.createElement("span");
    platform.className = "message-list__platform";
    appendText(platform, typeof message.platform === "string" ? message.platform : "");

    const time = document.createElement("time");
    time.className = "message-list__time";
    time.dateTime = typeof message.timestamp === "string" ? message.timestamp : "";
    appendText(time, formatTime(message.timestamp));

    const text = document.createElement("p");
    text.className = "message-list__text";
    appendMessageContent(text, message);

    meta.appendChild(user);
    meta.appendChild(platform);
    meta.appendChild(time);
    content.appendChild(meta);
    content.appendChild(text);
    item.appendChild(buildAvatar(message));
    item.appendChild(content);
    return item;
  }

  function isNearBottom() {
    return panel.scrollHeight - panel.scrollTop - panel.clientHeight <= SCROLL_THRESHOLD_PX;
  }

  function renderMessages(forceBottom) {
    const stickToBottom = forceBottom || isNearBottom();
    const previousTop = panel.scrollTop;
    const previousHeight = panel.scrollHeight;
    list.textContent = "";
    messages.forEach(function (message) { list.appendChild(buildMessageItem(message)); });
    emptyState.hidden = messages.length > 0;

    window.requestAnimationFrame(function () {
      if (stickToBottom) {
        panel.scrollTop = panel.scrollHeight;
      } else {
        panel.scrollTop = Math.max(0, previousTop + panel.scrollHeight - previousHeight);
      }
    });
  }

  function timestampValue(message) {
    const value = Date.parse(message.timestamp || "");
    return Number.isNaN(value) ? 0 : value;
  }

  function mergeMessages(incoming) {
    if (!Array.isArray(incoming)) {
      return;
    }
    const byKey = new Map();
    messages.concat(incoming).forEach(function (message) {
      if (message && typeof message === "object") {
        byKey.set(messageKey(message), message);
      }
    });
    messages = Array.from(byKey.values())
      .sort(function (left, right) { return timestampValue(left) - timestampValue(right); })
      .slice(-MESSAGE_LIMIT);
    renderMessages(false);
  }

  function wireToMessage(wire) {
    const user = typeof wire.user === "string" ? wire.user : "";
    return {
      id: typeof wire.id === "string" ? wire.id : "",
      platform: typeof wire.platform === "string" ? wire.platform : "",
      username: user,
      display_name: typeof wire.display_name === "string" && wire.display_name !== ""
        ? wire.display_name
        : user,
      message: typeof wire.message === "string" ? wire.message : "",
      fragments: Array.isArray(wire.fragments) ? wire.fragments : [],
      avatar_url: typeof wire.avatar_url === "string" ? wire.avatar_url : "",
      timestamp: typeof wire.timestamp === "string" && wire.timestamp !== ""
        ? wire.timestamp
        : new Date().toISOString(),
    };
  }

  async function loadRecentMessages() {
    try {
      const response = await fetch("/api/messages/recent?limit=" + String(MESSAGE_LIMIT));
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      mergeMessages(payload && Array.isArray(payload.messages) ? payload.messages : []);
    } catch {
      /* WebSocket messages can still keep the dock useful. */
    }
  }

  async function loadPreviewSettings() {
    try {
      const response = await fetch("/api/config");
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const settings = payload && payload.overlay && payload.overlay.image_previews;
      if (settings && typeof settings === "object") {
        previewSettings = settings;
        renderMessages(false);
      }
    } catch {
      /* Direct image previews stay disabled; text and emotes still render. */
    }
  }

  function wsURL() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.host + "/ws";
  }

  function scheduleReconnect() {
    if (!shouldRun || reconnectTimer !== null) {
      return;
    }
    reconnectTimer = window.setTimeout(function () {
      reconnectTimer = null;
      connectWebSocket();
    }, reconnectDelayMs);
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_MS);
  }

  function connectWebSocket() {
    if (!shouldRun || socket !== null) {
      return;
    }
    let nextSocket;
    try {
      nextSocket = new WebSocket(wsURL());
    } catch {
      scheduleReconnect();
      return;
    }
    socket = nextSocket;

    nextSocket.addEventListener("open", function () {
      reconnectDelayMs = INITIAL_RECONNECT_MS;
      loadRecentMessages();
    });
    nextSocket.addEventListener("message", function (event) {
      try {
        const wire = JSON.parse(event.data);
        if (wire && wire.type === "message") {
          mergeMessages([wireToMessage(wire)]);
        }
      } catch {
        /* Ignore malformed frames and keep listening. */
      }
    });
    nextSocket.addEventListener("close", function () {
      if (socket === nextSocket) {
        socket = null;
      }
      scheduleReconnect();
    });
    nextSocket.addEventListener("error", function () { nextSocket.close(); });
  }

  window.addEventListener("beforeunload", function () {
    shouldRun = false;
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
    }
    if (socket !== null) {
      socket.close();
    }
  });

  renderMessages(true);
  loadPreviewSettings();
  connectWebSocket();
}());
