import { appendText, createChatRender } from "/shared/chat-render.js?v=12";
import { createRewardControl, messageCanBeRewarded } from "/shared/reward-picker.js?v=4";
import { setLocale, t } from "/shared/i18n.js?v=18";
import {
  normalizeVisibilitySnapshot,
  presetOptions,
  visibilitySecondsRemaining,
} from "/dock/messages/leaderboard-controls.js?v=1";

"use strict";

  const MESSAGE_LIMIT = 100;
  const SCROLL_THRESHOLD_PX = 48;
  const INITIAL_RECONNECT_MS = 500;
  const MAX_RECONNECT_MS = 10000;

  const panel = document.getElementById("message-panel");
  const list = document.getElementById("messages");
  const emptyState = document.getElementById("empty-state");
  const presetSelect = document.getElementById("leaderboard-preset");
  const visibilityStatus = document.getElementById("leaderboard-visibility-status");
  const visibilityCountdown = document.getElementById("leaderboard-visibility-countdown");
  const toolbarError = document.getElementById("leaderboard-toolbar-error");
  const visibilityButtons = Array.from(document.querySelectorAll("[data-leaderboard-action]"));

  let messages = [];
  let socket = null;
  let reconnectTimer = null;
  let reconnectDelayMs = INITIAL_RECONNECT_MS;
  let shouldRun = true;
  let visibilitySnapshot = null;
  const visibilityActionsInFlight = new Set();
  let presetRequestInFlight = false;
  let previewSettings = {
    enabled: false,
    allowed_hosts: [],
    max_width_px: 320,
    max_height_px: 180,
  };
  function createTimeFormatter(locale) {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }

  function applyDockLocale(locale) {
    const next = locale === "en-GB" ? "en-GB" : "ru-RU";
    setLocale(next);
    if (emptyState) {
      emptyState.textContent = t("dock.waiting");
    }
    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      const key = element.getAttribute("data-i18n");
      if (key) {
        element.textContent = t(key);
      }
    });
    presetSelect?.setAttribute("aria-label", t("dock.preset"));
    renderVisibilityStatus();
  }

  function refreshTimeLocale(locale) {
    timeLocale = locale === "en-GB" ? "en-GB" : "ru-RU";
    applyDockLocale(timeLocale);
    timeFormatter = createTimeFormatter(timeLocale);
  }

  let timeLocale = "ru-RU";
  applyDockLocale(timeLocale);
  let timeFormatter = createTimeFormatter(timeLocale);

  function showToolbarError(message) {
    if (!toolbarError) {
      return;
    }
    toolbarError.textContent = message || "";
    toolbarError.hidden = !message;
  }

  function setNodeText(node, value) {
    if (node && node.textContent !== value) {
      node.textContent = value;
    }
  }

  function renderVisibilityStatus() {
    if (!visibilityStatus) {
      return;
    }
    if (!visibilitySnapshot) {
      setNodeText(visibilityStatus, t("dock.visibilityUnavailable"));
      if (visibilityCountdown) {
        setNodeText(visibilityCountdown, "");
      }
      return;
    }
    if (visibilitySnapshot.state === "pinned") {
      setNodeText(visibilityStatus, t("dock.visibilityPinned"));
      if (visibilityCountdown) {
        setNodeText(visibilityCountdown, "");
      }
      return;
    }
    if (visibilitySnapshot.state === "timed") {
      const seconds = visibilitySecondsRemaining(visibilitySnapshot, Date.now());
      setNodeText(visibilityStatus, t("dock.visibilityTimed"));
      if (visibilityCountdown) {
        setNodeText(visibilityCountdown, " · " + t("dock.secondsRemaining", { seconds: seconds }));
        visibilityCountdown.setAttribute("aria-label", t("dock.secondsRemaining", { seconds: seconds }));
      }
      return;
    }
    setNodeText(visibilityStatus, t("dock.visibilityHidden"));
    if (visibilityCountdown) {
      setNodeText(visibilityCountdown, "");
    }
  }

  function setVisibilitySnapshot(value) {
    const next = normalizeVisibilitySnapshot(value);
    if (!next) {
      return;
    }
    visibilitySnapshot = next;
    renderVisibilityStatus();
  }

  function setVisibilityBusy(action, busy) {
    if (busy) {
      visibilityActionsInFlight.add(action);
    } else {
      visibilityActionsInFlight.delete(action);
    }
    const button = visibilityButtons.find(function (candidate) {
      return candidate.dataset.leaderboardAction === action;
    });
    if (button) {
      button.disabled = busy;
      button.setAttribute("aria-busy", busy ? "true" : "false");
    }
  }

  async function loadVisibility() {
    try {
      const response = await fetch("/api/leaderboard/visibility", { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error("visibility unavailable");
      }
      setVisibilitySnapshot(await response.json());
      showToolbarError("");
    } catch {
      renderVisibilityStatus();
    }
  }

  async function runVisibilityAction(action) {
    if (visibilityActionsInFlight.has(action)) {
      return;
    }
    setVisibilityBusy(action, true);
    showToolbarError("");
    try {
      const response = await fetch("/api/leaderboard/" + action, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        throw new Error("action failed");
      }
      setVisibilitySnapshot(await response.json());
    } catch {
      showToolbarError(t("dock.actionFailed"));
    } finally {
      setVisibilityBusy(action, false);
    }
  }

  function renderPresets(config) {
    if (!presetSelect) {
      return;
    }
    const options = presetOptions(config);
    presetSelect.textContent = "";
    options.presets.forEach(function (preset) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.append(option);
    });
    presetSelect.value = options.activeId;
    presetSelect.disabled = presetRequestInFlight || options.presets.length === 0;
  }

  async function activatePreset(presetId) {
    if (!presetSelect || presetRequestInFlight || presetId === "") {
      return;
    }
    presetRequestInFlight = true;
    presetSelect.disabled = true;
    presetSelect.setAttribute("aria-busy", "true");
    showToolbarError("");
    try {
      const response = await fetch("/api/overlay/activate", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId }),
      });
      if (!response.ok) {
        throw new Error("preset failed");
      }
      renderPresets(await response.json());
    } catch {
      showToolbarError(t("dock.presetFailed"));
      await loadDisplaySettings();
    } finally {
      presetRequestInFlight = false;
      presetSelect.disabled = presetSelect.options.length === 0;
      presetSelect.setAttribute("aria-busy", "false");
    }
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

  const chatRender = createChatRender({
    classes: {
      emote: "message-list__emote",
      imagePreview: "message-list__image-preview",
      avatar: "message-list__avatar",
    },
    avatarFallback: "compact",
    imagePreviewEnabled: function () {
      return previewSettings.enabled;
    },
    resolvePreviewURL: safePreviewURL,
    applyImagePreviewStyles: function (img) {
      img.style.setProperty("--preview-max-width", String(previewSettings.max_width_px || 320) + "px");
      img.style.setProperty("--preview-max-height", String(previewSettings.max_height_px || 180) + "px");
    },
  });

  const {
    appendMessageContent,
    buildAvatarImage: buildAvatar,
    messageDisplayName: displayName,
    userAccent,
  } = chatRender;

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

  function formatTime(value) {
    if (typeof value !== "string" || value === "") {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return timeFormatter.format(date);
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

    const actions = document.createElement("div");
    actions.className = "message-list__actions";

    if (messageCanBeRewarded(message)) {
      actions.appendChild(createRewardControl(message, {
        t: t,
        resolveURL: function (path) { return path; },
        displayName: displayName,
        flipClass: "reward-picker--flip",
      }));
    }

    if (typeof message.id === "string" && message.id !== "") {
      const deleteButton = document.createElement("button");
      deleteButton.className = "message-list__delete";
      deleteButton.type = "button";
      deleteButton.textContent = t("dock.delete");
      deleteButton.setAttribute("aria-label", t("dock.deleteAria", { user: displayName(message) }));
      deleteButton.addEventListener("click", function () {
        deleteMessage(message, deleteButton);
      });
      actions.appendChild(deleteButton);
    }

    if (actions.childElementCount > 0) {
      meta.appendChild(actions);
    }
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

  function isSameMessage(message, platform, id) {
    return Boolean(
      message &&
        typeof message.id === "string" &&
        message.id === id &&
        typeof message.platform === "string" &&
        message.platform === platform
    );
  }

  function removeMessage(platform, id) {
    const next = messages.filter(function (message) {
      return !isSameMessage(message, platform, id);
    });
    if (next.length === messages.length) {
      return;
    }
    messages = next;
    renderMessages(false);
  }

  async function deleteMessage(message, button) {
    button.disabled = true;
    button.title = "";
    try {
      const response = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: message.platform, id: message.id }),
      });
      if (!response.ok && response.status !== 404) {
        throw new Error("delete failed");
      }
      removeMessage(message.platform, message.id);
    } catch {
      button.disabled = false;
      button.title = t("dock.deleteFailed");
    }
  }

  function wireToMessage(wire) {
    const user = typeof wire.user === "string" ? wire.user : "";
    return {
      id: typeof wire.id === "string" ? wire.id : "",
      platform: typeof wire.platform === "string" ? wire.platform : "",
      user_id: typeof wire.user_id === "string" ? wire.user_id : "",
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

  async function loadDisplaySettings() {
    try {
      const response = await fetch("/api/config");
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      renderPresets(payload);
      const settings = payload && payload.overlay && payload.overlay.image_previews;
      if (settings && typeof settings === "object") {
        previewSettings = settings;
      }
      const locale = payload && payload.admin && payload.admin.time_locale;
      refreshTimeLocale(locale);
      renderMessages(false);
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
      loadVisibility();
    });
    nextSocket.addEventListener("message", function (event) {
      try {
        const wire = JSON.parse(event.data);
        if (wire && wire.type === "message_deleted") {
          removeMessage(wire.platform, wire.id);
        } else if (wire && wire.type === "message") {
          mergeMessages([wireToMessage(wire)]);
        } else if (wire && wire.type === "leaderboard_visibility") {
          setVisibilitySnapshot(wire);
        } else if (wire && wire.type === "overlay_settings") {
          loadDisplaySettings();
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

  visibilityButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      runVisibilityAction(button.dataset.leaderboardAction || "");
    });
  });
  presetSelect?.addEventListener("change", function () {
    activatePreset(presetSelect.value);
  });
  window.setInterval(renderVisibilityStatus, 1000);

  renderMessages(true);
  Promise.all([loadDisplaySettings(), loadRecentMessages(), loadVisibility()]).finally(connectWebSocket);
