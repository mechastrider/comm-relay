(function () {
  "use strict";

  const form = document.getElementById("settings-form");
  const saveButton = document.getElementById("save-button");
  const banner = document.getElementById("banner");
  const twitchStatus = document.getElementById("twitch-status");
  const twitchEnabled = document.getElementById("twitch-enabled");
  const twitchChannel = document.getElementById("twitch-channel");
  const overlayMaxMessages = document.getElementById("overlay-max-messages");
  const overlayMessageTTL = document.getElementById("overlay-message-ttl");
  const recentMessages = document.getElementById("recent-messages");
  const recentMessagesEmpty = document.getElementById("recent-messages-empty");
  const refreshMessages = document.getElementById("refresh-messages");

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
  }

  function buildPayload() {
    return {
      server_port: currentConfig ? currentConfig.server_port : 17877,
      twitch: {
        enabled: twitchEnabled.checked,
        channel: twitchChannel.value.trim().toLowerCase(),
      },
      youtube: currentConfig
        ? currentConfig.youtube
        : { enabled: false },
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

  function renderStatus(status) {
    const twitch = status.twitch || {};
    const state = typeof twitch.state === "string" ? twitch.state : "unknown";
    twitchStatus.textContent = state.replace(/_/g, " ");
    twitchStatus.className = "status-pill status-pill--" + state;
  }

  function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
  }

  function renderRecentMessages(messages) {
    recentMessages.textContent = "";

    if (!messages || messages.length === 0) {
      recentMessagesEmpty.hidden = false;
      return;
    }

    recentMessagesEmpty.hidden = true;

    messages.forEach(function (msg) {
      const item = document.createElement("li");
      item.className = "message-list__item";

      const meta = document.createElement("div");
      meta.className = "message-list__meta";

      const user = document.createElement("span");
      user.className = "message-list__user";
      const displayName =
        typeof msg.display_name === "string" && msg.display_name !== ""
          ? msg.display_name
          : typeof msg.username === "string"
            ? msg.username
            : "?";
      appendText(user, displayName);

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
      recentMessages.appendChild(item);
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

  async function loadRecentMessages() {
    const response = await fetch(apiURL("/api/messages/recent?limit=20"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    renderRecentMessages((payload && payload.messages) || []);
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

  refreshAll().catch(function () {
    showBanner("error", "Cannot reach Chat Relay — is it running?");
  });

  statusTimer = window.setInterval(function () {
    loadStatus().catch(function () {
      /* keep last known status */
    });
  }, 5000);

  messagesTimer = window.setInterval(function () {
    loadRecentMessages().catch(function () {
      /* keep last known messages */
    });
  }, 5000);

  window.addEventListener("beforeunload", function () {
    window.clearInterval(statusTimer);
    window.clearInterval(messagesTimer);
  });
})();
