(function () {
  "use strict";

  const form = document.getElementById("settings-form");
  const saveButton = document.getElementById("save-button");
  const banner = document.getElementById("banner");
  const twitchStatus = document.getElementById("twitch-status");
  const twitchEnabled = document.getElementById("twitch-enabled");
  const twitchChannel = document.getElementById("twitch-channel");
  const youtubeStatus = document.getElementById("youtube-status");
  const youtubeOAuthLabel = document.getElementById("youtube-oauth-label");
  const youtubeDetail = document.getElementById("youtube-detail");
  const youtubeEnabled = document.getElementById("youtube-enabled");
  const youtubeClientId = document.getElementById("youtube-client-id");
  const youtubeClientSecret = document.getElementById("youtube-client-secret");
  const youtubeConnect = document.getElementById("youtube-connect");
  const overlayMaxMessages = document.getElementById("overlay-max-messages");
  const overlayMessageTTL = document.getElementById("overlay-message-ttl");
  const recentMessages = document.getElementById("recent-messages");
  const recentMessagesEmpty = document.getElementById("recent-messages-empty");
  const refreshMessages = document.getElementById("refresh-messages");
  const messageSoundEnabledInput = document.getElementById("message-sound-enabled");
  const testMessageSound = document.getElementById("test-message-sound");

  const SOUND_STORAGE_KEY = "admin_message_sound_enabled";
  const RECENT_MESSAGE_LIMIT = 20;
  const INITIAL_WS_RECONNECT_MS = 1000;
  const MAX_WS_RECONNECT_MS = 30000;

  const fieldErrors = {
    twitch_channel: document.getElementById("twitch-channel-error"),
    overlay_max_messages: document.getElementById("overlay-max-messages-error"),
    overlay_message_ttl_seconds: document.getElementById("overlay-message-ttl-error"),
  };

  const fieldInputs = {
    twitch_channel: twitchChannel,
    overlay_max_messages: overlayMaxMessages,
    overlay_message_ttl_seconds: overlayMessageTTL,
  };

  let currentConfig = null;
  let statusTimer = null;
  let messagesTimer = null;
  let messageSoundEnabled = window.localStorage.getItem(SOUND_STORAGE_KEY) === "true";
  let soundReady = false;
  let knownMessageKeys = new Set();
  let wsSocket = null;
  let wsShouldRun = true;
  let wsReconnectDelayMs = INITIAL_WS_RECONNECT_MS;
  let wsReconnectTimer = null;
  let audioCtx = null;

  function apiURL(path) {
    return window.location.origin + path;
  }

  function showBanner(kind, message) {
    banner.hidden = false;
    banner.className = "banner banner--" + kind;
    banner.textContent = message;
  }

  function hideBanner() {
    banner.hidden = true;
    banner.textContent = "";
    banner.className = "banner";
  }

  function clearFieldErrors() {
    Object.keys(fieldErrors).forEach(function (key) {
      const el = fieldErrors[key];
      const input = fieldInputs[key];
      if (el) {
        el.hidden = true;
        el.textContent = "";
      }
      if (input) {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    });
  }

  function setFieldError(field, message) {
    const el = fieldErrors[field];
    const input = fieldInputs[field];
    if (!el || !input) {
      return;
    }
    el.hidden = false;
    el.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", el.id);
  }

  function mapHTTPError(status, bodyError) {
    if (bodyError) {
      return bodyError;
    }
    if (status === 400) {
      return "Check the highlighted fields.";
    }
    if (status >= 500) {
      return "Server error — try again.";
    }
    return "Request failed.";
  }

  async function readJSON(response) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return payload;
  }

  function applyConfig(config) {
    currentConfig = config;
    twitchEnabled.checked = Boolean(config.twitch && config.twitch.enabled);
    twitchChannel.value = config.twitch && config.twitch.channel ? config.twitch.channel : "";
    overlayMaxMessages.value = String(config.overlay ? config.overlay.max_messages : 30);
    overlayMessageTTL.value = String(
      config.overlay ? config.overlay.message_ttl_seconds : 20
    );

    if (config.youtube) {
      youtubeEnabled.checked = Boolean(config.youtube.enabled);
      const oauth = config.youtube.oauth || {};
      youtubeClientId.value = oauth.client_id || "";
      youtubeClientSecret.value = "";
    }
  }

  function buildPayload() {
    return {
      server_port: currentConfig ? currentConfig.server_port : 17877,
      twitch: {
        enabled: twitchEnabled.checked,
        channel: twitchChannel.value.trim().toLowerCase(),
      },
      youtube: {
        enabled: youtubeEnabled.checked,
        oauth: {
          client_id: youtubeClientId.value.trim(),
          client_secret: youtubeClientSecret.value,
        },
      },
      vk: currentConfig ? currentConfig.vk : { enabled: false },
      overlay: {
        max_messages: Number.parseInt(overlayMaxMessages.value, 10),
        message_ttl_seconds: Number.parseInt(overlayMessageTTL.value, 10),
      },
    };
  }

  function validateClient(payload) {
    clearFieldErrors();
    let firstInvalid = null;

    if (payload.twitch.enabled && payload.twitch.channel === "") {
      setFieldError("twitch_channel", "Channel is required when Twitch is enabled.");
      firstInvalid = twitchChannel;
    } else if (
      payload.twitch.channel !== "" &&
      !/^[a-z0-9_]{1,25}$/.test(payload.twitch.channel)
    ) {
      setFieldError(
        "twitch_channel",
        "Use a lowercase Twitch login (letters, numbers, underscore)."
      );
      firstInvalid = twitchChannel;
    }

    if (!Number.isFinite(payload.overlay.max_messages) || payload.overlay.max_messages < 1) {
      setFieldError("overlay_max_messages", "Enter at least 1 message.");
      firstInvalid = firstInvalid || overlayMaxMessages;
    }

    if (
      !Number.isFinite(payload.overlay.message_ttl_seconds) ||
      payload.overlay.message_ttl_seconds < 0
    ) {
      setFieldError("overlay_message_ttl_seconds", "TTL must be 0 or greater.");
      firstInvalid = firstInvalid || overlayMessageTTL;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }

    return true;
  }

  function renderPlatformStatus(el, platform) {
    const state = typeof platform.state === "string" ? platform.state : "unknown";
    el.textContent = state.replace(/_/g, " ");
    el.className = "status-pill status-pill--" + state;
  }

  function renderStatus(status) {
    renderPlatformStatus(twitchStatus, status.twitch || {});

    const youtube = status.youtube || {};
    renderPlatformStatus(youtubeStatus, youtube);

    if (youtube.oauth_connected) {
      youtubeOAuthLabel.textContent = "Connected";
    } else {
      youtubeOAuthLabel.textContent = "Not connected";
    }

    if (typeof youtube.detail === "string" && youtube.detail !== "") {
      youtubeDetail.hidden = false;
      youtubeDetail.textContent = youtube.detail;
    } else {
      youtubeDetail.hidden = true;
      youtubeDetail.textContent = "";
    }
  }

  function handleOAuthQuery() {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    const oauthError = params.get("oauth_error");

    if (oauth === "success") {
      showBanner("success", "YouTube connected. Enable the connector and save settings.");
    } else if (oauthError) {
      const messages = {
        denied: "YouTube authorization was denied.",
        not_configured: "Set OAuth client ID and secret, save, then connect again.",
        exchange_failed: "YouTube token exchange failed — check credentials and redirect URI.",
      };
      showBanner("error", messages[oauthError] || "YouTube authorization failed.");
    }

    if (oauth || oauthError) {
      params.delete("oauth");
      params.delete("oauth_error");
      const query = params.toString();
      const next = window.location.pathname + (query ? "?" + query : "");
      window.history.replaceState({}, "", next);
    }
  }

  function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
  }

  function messageDisplayName(msg) {
    if (typeof msg.display_name === "string" && msg.display_name !== "") {
      return msg.display_name;
    }
    if (typeof msg.username === "string" && msg.username !== "") {
      return msg.username;
    }
    return "?";
  }

  function messageKey(msg) {
    return [
      typeof msg.platform === "string" ? msg.platform : "",
      messageDisplayName(msg),
      typeof msg.message === "string" ? msg.message : "",
      typeof msg.timestamp === "string" ? msg.timestamp : "",
    ].join("\0");
  }

  function hasNewMessages(messages) {
    if (!messages || messages.length === 0) {
      return false;
    }
    return messages.some(function (msg) {
      return !knownMessageKeys.has(messageKey(msg));
    });
  }

  function trackMessages(messages) {
    if (!messages) {
      return;
    }
    messages.forEach(function (msg) {
      knownMessageKeys.add(messageKey(msg));
    });
  }

  function wireToAdminMessage(wire) {
    const user = typeof wire.user === "string" ? wire.user : "";
    const displayName =
      typeof wire.display_name === "string" && wire.display_name !== ""
        ? wire.display_name
        : user;

    return {
      platform: typeof wire.platform === "string" ? wire.platform : "",
      username: user,
      display_name: displayName,
      message: typeof wire.message === "string" ? wire.message : "",
      timestamp: new Date().toISOString(),
    };
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return Promise.reject(new Error("Web Audio not supported"));
      }
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      return audioCtx.resume();
    }
    return Promise.resolve();
  }

  function playMessageSound(force) {
    if (!force && !messageSoundEnabled) {
      return;
    }
    ensureAudioContext()
      .then(function () {
        const ctx = audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.14);
      })
      .catch(function () {
        /* autoplay policy or missing Web Audio */
      });
  }

  function maybePlayMessageSound(messages) {
    if (!soundReady || !messageSoundEnabled || !hasNewMessages(messages)) {
      return;
    }
    playMessageSound();
  }

  function buildMessageListItem(msg) {
    const item = document.createElement("li");
    item.className = "message-list__item";

    const meta = document.createElement("div");
    meta.className = "message-list__meta";

    const user = document.createElement("span");
    user.className = "message-list__user";
    appendText(user, messageDisplayName(msg));

    const platform = document.createElement("span");
    appendText(platform, typeof msg.platform === "string" ? msg.platform : "");

    const time = document.createElement("time");
    if (typeof msg.timestamp === "string") {
      time.dateTime = msg.timestamp;
      appendText(time, new Date(msg.timestamp).toLocaleTimeString());
    }

    meta.appendChild(user);
    meta.appendChild(platform);
    meta.appendChild(time);

    const text = document.createElement("p");
    text.className = "message-list__text";
    appendText(text, typeof msg.message === "string" ? msg.message : "");

    item.appendChild(meta);
    item.appendChild(text);
    return item;
  }

  function appendRecentMessage(msg) {
    recentMessagesEmpty.hidden = true;
    recentMessages.appendChild(buildMessageListItem(msg));
    while (recentMessages.children.length > RECENT_MESSAGE_LIMIT) {
      recentMessages.removeChild(recentMessages.firstChild);
    }
  }

  function renderRecentMessages(messages) {
    recentMessages.textContent = "";

    if (!messages || messages.length === 0) {
      recentMessagesEmpty.hidden = false;
      return;
    }

    recentMessagesEmpty.hidden = true;

    messages.forEach(function (msg) {
      recentMessages.appendChild(buildMessageListItem(msg));
    });
  }

  function wsURL() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.host + "/ws";
  }

  function clearWSReconnectTimer() {
    if (wsReconnectTimer !== null) {
      window.clearTimeout(wsReconnectTimer);
      wsReconnectTimer = null;
    }
  }

  function scheduleWSReconnect() {
    if (!wsShouldRun || wsReconnectTimer !== null) {
      return;
    }
    wsReconnectTimer = window.setTimeout(function () {
      wsReconnectTimer = null;
      connectMessageWebSocket();
    }, wsReconnectDelayMs);
    wsReconnectDelayMs = Math.min(wsReconnectDelayMs * 2, MAX_WS_RECONNECT_MS);
  }

  function handleWireMessage(wire) {
    if (!wire || wire.type !== "message") {
      return;
    }

    const msg = wireToAdminMessage(wire);
    const key = messageKey(msg);
    if (knownMessageKeys.has(key)) {
      return;
    }
    knownMessageKeys.add(key);
    appendRecentMessage(msg);

    if (soundReady && messageSoundEnabled) {
      playMessageSound();
    }
  }

  function connectMessageWebSocket() {
    if (!wsShouldRun || wsSocket) {
      return;
    }

    let socket;
    try {
      socket = new WebSocket(wsURL());
    } catch {
      scheduleWSReconnect();
      return;
    }

    wsSocket = socket;

    socket.addEventListener("open", function () {
      wsReconnectDelayMs = INITIAL_WS_RECONNECT_MS;
    });

    socket.addEventListener("message", function (event) {
      let wire = null;
      try {
        wire = JSON.parse(event.data);
      } catch {
        return;
      }
      handleWireMessage(wire);
    });

    socket.addEventListener("close", function () {
      if (wsSocket === socket) {
        wsSocket = null;
      }
      scheduleWSReconnect();
    });

    socket.addEventListener("error", function () {
      socket.close();
    });
  }

  function disconnectMessageWebSocket() {
    wsShouldRun = false;
    clearWSReconnectTimer();
    if (wsSocket) {
      wsSocket.close();
      wsSocket = null;
    }
  }

  function initMessageSoundControls() {
    messageSoundEnabledInput.checked = messageSoundEnabled;

    messageSoundEnabledInput.addEventListener("change", function () {
      messageSoundEnabled = messageSoundEnabledInput.checked;
      window.localStorage.setItem(
        SOUND_STORAGE_KEY,
        messageSoundEnabled ? "true" : "false"
      );
      if (messageSoundEnabled) {
        ensureAudioContext().catch(function () {
          /* user must use Test sound if blocked */
        });
      }
    });

    testMessageSound.addEventListener("click", function () {
      ensureAudioContext()
        .then(function () {
          playMessageSound(true);
        })
        .catch(function () {
          showBanner("error", "Sound is not available in this browser.");
        });
    });
  }

  async function loadConfig() {
    const response = await fetch(apiURL("/api/config"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    applyConfig(payload);
  }

  async function loadStatus() {
    const response = await fetch(apiURL("/api/status"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    renderStatus(payload);
  }

  async function loadRecentMessages(options) {
    const playSound = options && options.playSound;
    const response = await fetch(
      apiURL("/api/messages/recent?limit=" + String(RECENT_MESSAGE_LIMIT))
    );
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    const messages = (payload && payload.messages) || [];
    if (playSound) {
      maybePlayMessageSound(messages);
    }
    trackMessages(messages);
    renderRecentMessages(messages);
    soundReady = true;
  }

  async function refreshAll() {
    await Promise.all([loadConfig(), loadStatus(), loadRecentMessages()]);
  }

  async function saveSettings(event) {
    event.preventDefault();
    hideBanner();
    clearFieldErrors();

    const payload = buildPayload();
    if (!validateClient(payload)) {
      showBanner("error", "Check the highlighted fields.");
      return;
    }

    saveButton.disabled = true;

    try {
      const response = await fetch(apiURL("/api/config"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJSON(response);
      if (!response.ok) {
        showBanner("error", mapHTTPError(response.status, body && body.error));
        return;
      }

      applyConfig(body);
      showBanner("success", "Settings saved.");
      await loadStatus();
    } catch {
      showBanner("error", "Cannot reach Chat Relay — is it running?");
    } finally {
      saveButton.disabled = false;
    }
  }

  function bindFieldClear(fieldKey) {
    const input = fieldInputs[fieldKey];
    if (!input) {
      return;
    }
    input.addEventListener("input", function () {
      const el = fieldErrors[fieldKey];
      if (el && !el.hidden) {
        el.hidden = true;
        el.textContent = "";
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    });
  }

  Object.keys(fieldInputs).forEach(bindFieldClear);

  form.addEventListener("submit", saveSettings);
  refreshMessages.addEventListener("click", function () {
    loadRecentMessages().catch(function () {
      showBanner("error", "Cannot load recent messages.");
    });
  });

  handleOAuthQuery();
  initMessageSoundControls();

  refreshAll().catch(function () {
    showBanner("error", "Cannot reach Chat Relay — is it running?");
  });

  connectMessageWebSocket();

  statusTimer = window.setInterval(function () {
    loadStatus().catch(function () {
      /* keep last known status */
    });
  }, 5000);

  messagesTimer = window.setInterval(function () {
    loadRecentMessages({ playSound: true }).catch(function () {
      /* keep last known messages */
    });
  }, 5000);

  window.addEventListener("beforeunload", function () {
    disconnectMessageWebSocket();
    window.clearInterval(statusTimer);
    window.clearInterval(messagesTimer);
  });
})();
