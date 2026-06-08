(function () {
  "use strict";

  const form = document.getElementById("settings-form");
  const cockpitShell = document.querySelector(".cockpit-shell");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const saveButtons = Array.from(document.querySelectorAll("[data-save-button]"));
  const settingsState = document.getElementById("settings-state");
  const footerSettingsState = document.getElementById("footer-settings-state");
  const banner = document.getElementById("banner");
  const twitchStatus = document.getElementById("twitch-status");
  const twitchDetail = document.getElementById("twitch-detail");
  const twitchEnabled = document.getElementById("twitch-enabled");
  const twitchChannel = document.getElementById("twitch-channel");
  const youtubeStatus = document.getElementById("youtube-status");
  const youtubeOAuthLabel = document.getElementById("youtube-oauth-label");
  const youtubeDetail = document.getElementById("youtube-detail");
  const youtubeEnabled = document.getElementById("youtube-enabled");
  const youtubeChatMode = document.getElementById("youtube-chat-mode");
  const youtubeClientId = document.getElementById("youtube-client-id");
  const youtubeClientSecret = document.getElementById("youtube-client-secret");
  const youtubeConnect = document.getElementById("youtube-connect");
  const vkStatus = document.getElementById("vk-status");
  const vkDetail = document.getElementById("vk-detail");
  const diagUptime = document.getElementById("diag-uptime");
  const diagWsClients = document.getElementById("diag-ws-clients");
  const diagMessageCounts = document.getElementById("diag-message-counts");
  const vkEnabled = document.getElementById("vk-enabled");
  const vkChannel = document.getElementById("vk-channel");
  if (!vkEnabled || !vkChannel) {
    console.error("VK Live settings controls are missing from the page");
  }
  const overlayMaxMessages = document.getElementById("overlay-max-messages");
  const overlayMessageTTL = document.getElementById("overlay-message-ttl");
  const overlayFontSize = document.getElementById("overlay-font-size");
  const overlayDisplayMode = document.getElementById("overlay-display-mode");
  const overlayTheme = document.getElementById("overlay-theme");
  const emotesTwitch = document.getElementById("emotes-twitch");
  const emotesYouTube = document.getElementById("emotes-youtube");
  const emotesVK = document.getElementById("emotes-vk");
  const emotesFFZ = document.getElementById("emotes-ffz");
  const emotesBTTV = document.getElementById("emotes-bttv");
  const emotesSevenTV = document.getElementById("emotes-7tv");
  const imagePreviewsEnabled = document.getElementById("image-previews-enabled");
  const imagePreviewsAllowedHosts = document.getElementById("image-previews-allowed-hosts");
  const imagePreviewsMaxWidth = document.getElementById("image-previews-max-width");
  const imagePreviewsMaxHeight = document.getElementById("image-previews-max-height");
  const imagePreviewsMaxPerMessage = document.getElementById("image-previews-max-per-message");
  const emoteCacheEntries = document.getElementById("emote-cache-entries");
  const emoteProviderList = document.getElementById("emote-provider-list");
  const recentMessages = document.getElementById("recent-messages");
  const recentMessagesEmpty = document.getElementById("recent-messages-empty");
  const refreshMessages = document.getElementById("refresh-messages");
  const messageSoundEnabledInput = document.getElementById("message-sound-enabled");
  const messageSoundVolumeInput = document.getElementById("message-sound-volume");
  const messageSoundVolumeLabel = document.getElementById("message-sound-volume-label");
  const messageSoundTypeInput = document.getElementById("message-sound-type");
  const testMessageSound = document.getElementById("test-message-sound");

  const MESSAGE_SOUND_TYPES = ["chime", "ping", "soft", "alert"];
  const RECENT_MESSAGE_LIMIT = 20;
  const BANNER_SUCCESS_DISMISS_MS = 4000;
  const INITIAL_WS_RECONNECT_MS = 1000;
  const MAX_WS_RECONNECT_MS = 30000;
  const SIDEBAR_COLLAPSED_KEY = "chatRelay.sidebarCollapsed";

  const fieldErrors = {
    twitch_channel: document.getElementById("twitch-channel-error"),
    vk_channel: document.getElementById("vk-channel-error"),
    overlay_max_messages: document.getElementById("overlay-max-messages-error"),
    overlay_message_ttl_seconds: document.getElementById("overlay-message-ttl-error"),
    overlay_font_size_px: document.getElementById("overlay-font-size-error"),
    overlay_display_mode: document.getElementById("overlay-display-mode-error"),
    overlay_theme: document.getElementById("overlay-theme-error"),
    overlay_image_previews_allowed_hosts: document.getElementById("image-previews-allowed-hosts-error"),
    overlay_image_previews_max_width_px: document.getElementById("image-previews-max-width-error"),
    overlay_image_previews_max_height_px: document.getElementById("image-previews-max-height-error"),
    overlay_image_previews_max_per_message: document.getElementById("image-previews-max-per-message-error"),
    admin_message_sound_volume: document.getElementById("message-sound-volume-error"),
    admin_message_sound_sound: document.getElementById("message-sound-type-error"),
  };

  const fieldInputs = {
    twitch_channel: twitchChannel,
    vk_channel: vkChannel,
    overlay_max_messages: overlayMaxMessages,
    overlay_message_ttl_seconds: overlayMessageTTL,
    overlay_font_size_px: overlayFontSize,
    overlay_display_mode: overlayDisplayMode,
    overlay_theme: overlayTheme,
    overlay_image_previews_allowed_hosts: imagePreviewsAllowedHosts,
    overlay_image_previews_max_width_px: imagePreviewsMaxWidth,
    overlay_image_previews_max_height_px: imagePreviewsMaxHeight,
    overlay_image_previews_max_per_message: imagePreviewsMaxPerMessage,
    admin_message_sound_volume: messageSoundVolumeInput,
    admin_message_sound_sound: messageSoundTypeInput,
  };

  const PROVIDER_LABELS = {
    twitch: "Twitch",
    ffz: "FFZ",
    bttv: "BTTV",
    "7tv": "7TV",
  };

  let currentConfig = null;
  let settingsLoaded = false;
  let settingsDirty = false;
  let saveInFlight = false;
  let statusTimer = null;
  let messagesTimer = null;
  let soundReady = false;
  let knownMessageKeys = new Set();
  let wsSocket = null;
  let wsShouldRun = true;
  let wsReconnectDelayMs = INITIAL_WS_RECONNECT_MS;
  let wsReconnectTimer = null;
  let audioCtx = null;
  let bannerTimer = null;

  function apiURL(path) {
    return window.location.origin + path;
  }

  function showBanner(kind, message) {
    if (bannerTimer) {
      window.clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    banner.hidden = false;
    banner.className = "banner banner--" + kind;
    banner.textContent = message;
    if (kind === "success") {
      bannerTimer = window.setTimeout(function () {
        bannerTimer = null;
        hideBanner();
      }, BANNER_SUCCESS_DISMISS_MS);
    }
  }

  function hideBanner() {
    if (bannerTimer) {
      window.clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    banner.hidden = true;
    banner.textContent = "";
    banner.className = "banner";
  }

  function readSidebarCollapsedPreference() {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function writeSidebarCollapsedPreference(collapsed) {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
    } catch (error) {
      /* localStorage can be unavailable in locked-down browser contexts. */
    }
  }

  function setSidebarCollapsed(collapsed, options) {
    const shouldPersist = !options || options.persist !== false;
    if (!cockpitShell || !sidebarToggle) {
      return;
    }

    cockpitShell.classList.toggle("sidebar-collapsed", collapsed);
    sidebarToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    sidebarToggle.setAttribute(
      "aria-label",
      collapsed ? "Expand systems panel" : "Collapse systems panel"
    );
    sidebarToggle.title = collapsed ? "Expand systems panel" : "Collapse systems panel";

    const chevron = sidebarToggle.querySelector(".sidebar-toggle__chevron");
    if (chevron) {
      chevron.textContent = collapsed ? "<" : ">";
    }

    if (shouldPersist) {
      writeSidebarCollapsedPreference(collapsed);
    }
  }

  function initSidebarToggle() {
    if (!cockpitShell || !sidebarToggle) {
      return;
    }

    setSidebarCollapsed(readSidebarCollapsedPreference(), { persist: false });
    sidebarToggle.addEventListener("click", function () {
      setSidebarCollapsed(!cockpitShell.classList.contains("sidebar-collapsed"));
    });
  }

  function setSaveButtonsDisabled(disabled) {
    saveButtons.forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function setSettingsStateText(message, stateClass) {
    if (settingsState) {
      settingsState.textContent = message;
      settingsState.className = stateClass ? "settings-state " + stateClass : "settings-state";
    }
    if (footerSettingsState) {
      footerSettingsState.textContent = message;
      footerSettingsState.className = stateClass || "";
    }
  }

  function renderSettingsState() {
    if (saveInFlight) {
      setSettingsStateText("Saving", "");
      setSaveButtonsDisabled(true);
      return;
    }

    if (!settingsLoaded) {
      setSettingsStateText("Loading settings", "");
      setSaveButtonsDisabled(true);
      return;
    }

    if (settingsDirty) {
      setSettingsStateText("Unsaved changes", "settings-state--dirty");
      setSaveButtonsDisabled(false);
      return;
    }

    setSettingsStateText("Settings saved", "settings-state--saved");
    setSaveButtonsDisabled(true);
  }

  function markSettingsDirty() {
    if (!settingsLoaded || saveInFlight) {
      return;
    }
    settingsDirty = true;
    renderSettingsState();
  }

  function markSettingsClean() {
    settingsLoaded = true;
    settingsDirty = false;
    renderSettingsState();
  }

  function markSettingsUnavailable() {
    settingsLoaded = false;
    settingsDirty = false;
    renderSettingsState();
    setSettingsStateText("Settings unavailable", "");
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

  function applyServerFieldErrors(fields) {
    if (!fields || typeof fields !== "object") {
      return null;
    }
    clearFieldErrors();
    let firstInvalid = null;
    Object.keys(fields).forEach(function (key) {
      const message = fields[key];
      if (typeof message !== "string" || message === "") {
        return;
      }
      setFieldError(key, message);
      if (!firstInvalid && fieldInputs[key]) {
        firstInvalid = fieldInputs[key];
      }
    });
    return firstInvalid;
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

  function openDialogForElement(el) {
    if (!el) {
      return;
    }
    const dialog = el.closest("dialog");
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    }
  }

  function closeOpenDialogs() {
    document.querySelectorAll("dialog[open]").forEach(function (dialog) {
      dialog.close();
    });
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

  function normalizeVkChannel(raw) {
    let s = String(raw || "").trim().toLowerCase();
    if (s === "") {
      return "";
    }

    try {
      if (s.indexOf("://") !== -1 || s.indexOf("vkvideo.ru") !== -1) {
        const parsed = new URL(s.indexOf("://") !== -1 ? s : "https://" + s);
        const host = parsed.hostname.replace(/^www\./, "");
        if (host === "live.vkvideo.ru" || host === "vkvideo.ru") {
          const slug = parsed.pathname.replace(/^\/+/, "").split("/")[0];
          if (slug) {
            return slug;
          }
        }
      }
    } catch {
      /* use fallbacks below */
    }

    const fromPath = s.match(/(?:live\.)?vkvideo\.ru\/+([a-z0-9_-]{1,64})/);
    if (fromPath) {
      return fromPath[1];
    }

    return s.replace(/^[@/]+/, "");
  }

  function readVkSettings() {
    const enabledInput = document.getElementById("vk-enabled");
    const channelInput = document.getElementById("vk-channel");
    let enabled = enabledInput ? enabledInput.checked : false;
    let channel = channelInput ? normalizeVkChannel(channelInput.value) : "";

    if (form) {
      const formData = new FormData(form);
      const formChannel = formData.get("vk_channel");
      if (typeof formChannel === "string" && formChannel.trim() !== "") {
        channel = normalizeVkChannel(formChannel);
      }
      if (formData.get("vk_enabled") === "on") {
        enabled = true;
      } else if (enabledInput) {
        enabled = enabledInput.checked;
      }
    }

    return { enabled: enabled, channel: channel };
  }

  function parseAllowedHostsText(raw) {
    return String(raw || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim().toLowerCase();
      })
      .filter(function (host) {
        return host !== "";
      });
  }

  function formatAllowedHostsText(hosts) {
    if (!hosts || !Array.isArray(hosts)) {
      return "";
    }
    return hosts.join("\n");
  }

  function applyRichChatFromConfig(overlay) {
    const emotes = overlay.emotes || {};
    emotesTwitch.checked = emotes.twitch !== false;
    if (emotesYouTube) {
      emotesYouTube.checked = emotes.youtube !== false;
    }
    if (emotesVK) {
      emotesVK.checked = emotes.vk !== false;
    }
    emotesFFZ.checked = emotes.ffz !== false;
    emotesBTTV.checked = emotes.bttv !== false;
    emotesSevenTV.checked = emotes["7tv"] !== false;

    const previews = overlay.image_previews || {};
    imagePreviewsEnabled.checked = Boolean(previews.enabled);
    imagePreviewsAllowedHosts.value = formatAllowedHostsText(previews.allowed_hosts);
    imagePreviewsMaxWidth.value = String(
      typeof previews.max_width_px === "number" ? previews.max_width_px : 320
    );
    imagePreviewsMaxHeight.value = String(
      typeof previews.max_height_px === "number" ? previews.max_height_px : 180
    );
    imagePreviewsMaxPerMessage.value = String(
      typeof previews.max_per_message === "number" ? previews.max_per_message : 1
    );
  }

  function getRichChatSettings() {
    return {
      emotes: {
        twitch: emotesTwitch.checked,
        youtube: emotesYouTube ? emotesYouTube.checked : true,
        vk: emotesVK ? emotesVK.checked : true,
        ffz: emotesFFZ.checked,
        bttv: emotesBTTV.checked,
        "7tv": emotesSevenTV.checked,
      },
      image_previews: {
        enabled: imagePreviewsEnabled.checked,
        allowed_hosts: parseAllowedHostsText(imagePreviewsAllowedHosts.value),
        max_width_px: Number.parseInt(imagePreviewsMaxWidth.value, 10),
        max_height_px: Number.parseInt(imagePreviewsMaxHeight.value, 10),
        max_per_message: Number.parseInt(imagePreviewsMaxPerMessage.value, 10),
      },
    };
  }

  function applyConfig(config) {
    currentConfig = config;
    twitchEnabled.checked = Boolean(config.twitch && config.twitch.enabled);
    twitchChannel.value = config.twitch && config.twitch.channel ? config.twitch.channel : "";
    const overlay = config.overlay || {};
    overlayMaxMessages.value = String(
      typeof overlay.max_messages === "number" ? overlay.max_messages : 30
    );
    overlayMessageTTL.value = String(
      typeof overlay.message_ttl_seconds === "number" ? overlay.message_ttl_seconds : 20
    );
    overlayFontSize.value = String(
      typeof overlay.font_size_px === "number" ? overlay.font_size_px : 18
    );
    overlayDisplayMode.value =
      overlay.display_mode === "compact" ? "compact" : "normal";
    overlayTheme.value =
      overlay.theme === "dashboard" ? "dashboard" : "default";
    applyRichChatFromConfig(overlay);

    if (config.youtube) {
      youtubeEnabled.checked = Boolean(config.youtube.enabled);
      if (youtubeChatMode) {
        const mode = config.youtube.chat_mode || "stream";
        youtubeChatMode.value =
          mode === "poll" || mode === "auto" ? mode : "stream";
      }
      const oauth = config.youtube.oauth || {};
      youtubeClientId.value = oauth.client_id || "";
      youtubeClientSecret.value = "";
    }

    const vk = config.vk || { enabled: false, channel: "" };
    if (vkEnabled) {
      vkEnabled.checked = Boolean(vk.enabled);
    }
    if (vkChannel) {
      vkChannel.value = vk.channel ? vk.channel : "";
    }

    applyMessageSoundFromConfig(config);
    markSettingsClean();
  }

  function normalizeMessageSoundType(raw) {
    if (typeof raw === "string" && MESSAGE_SOUND_TYPES.indexOf(raw) !== -1) {
      return raw;
    }
    return "chime";
  }

  function clampVolumePercent(value) {
    if (!Number.isFinite(value)) {
      return 50;
    }
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  function applyMessageSoundFromConfig(config) {
    const ms =
      config && config.admin && config.admin.message_sound
        ? config.admin.message_sound
        : {};

    messageSoundEnabledInput.checked = Boolean(ms.enabled);

    const volumePercent = clampVolumePercent(
      typeof ms.volume === "number" ? ms.volume * 100 : 50
    );
    messageSoundVolumeInput.value = String(volumePercent);
    messageSoundVolumeLabel.textContent = String(volumePercent) + "%";

    messageSoundTypeInput.value = normalizeMessageSoundType(ms.sound);
  }

  function getMessageSoundSettings() {
    const volumePercent = clampVolumePercent(
      Number.parseInt(messageSoundVolumeInput.value, 10)
    );
    return {
      enabled: messageSoundEnabledInput.checked,
      volume: volumePercent / 100,
      sound: normalizeMessageSoundType(messageSoundTypeInput.value),
    };
  }

  function buildPayload() {
    const richChat = getRichChatSettings();
    return {
      server_port: currentConfig ? currentConfig.server_port : 17877,
      twitch: {
        enabled: twitchEnabled.checked,
        channel: twitchChannel.value.trim().toLowerCase(),
      },
      youtube: {
        enabled: youtubeEnabled.checked,
        chat_mode: youtubeChatMode ? youtubeChatMode.value : "stream",
        oauth: {
          client_id: youtubeClientId.value.trim(),
          client_secret: youtubeClientSecret.value,
        },
      },
      vk: readVkSettings(),
      overlay: {
        max_messages: Number.parseInt(overlayMaxMessages.value, 10),
        message_ttl_seconds: Number.parseInt(overlayMessageTTL.value, 10),
        font_size_px: Number.parseInt(overlayFontSize.value, 10),
        display_mode: overlayDisplayMode.value,
        theme: overlayTheme.value,
        emotes: richChat.emotes,
        image_previews: richChat.image_previews,
      },
      admin: {
        message_sound: getMessageSoundSettings(),
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

    if (payload.vk.enabled && payload.vk.channel === "") {
      setFieldError("vk_channel", "Channel slug is required when VK Live is enabled.");
      firstInvalid = firstInvalid || vkChannel;
    } else if (
      payload.vk.enabled &&
      payload.vk.channel !== "" &&
      !/^[a-z0-9_-]{1,64}$/.test(payload.vk.channel)
    ) {
      setFieldError(
        "vk_channel",
        "Use a lowercase channel slug (letters, numbers, underscore, hyphen)."
      );
      firstInvalid = firstInvalid || vkChannel;
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

    if (
      !Number.isFinite(payload.overlay.font_size_px) ||
      payload.overlay.font_size_px < 12 ||
      payload.overlay.font_size_px > 32
    ) {
      setFieldError("overlay_font_size_px", "Font size must be between 12 and 32 px.");
      firstInvalid = firstInvalid || overlayFontSize;
    }

    if (
      payload.overlay.display_mode !== "normal" &&
      payload.overlay.display_mode !== "compact"
    ) {
      setFieldError("overlay_display_mode", "Choose normal or compact layout.");
      firstInvalid = firstInvalid || overlayDisplayMode;
    }

    if (
      payload.overlay.theme !== "default" &&
      payload.overlay.theme !== "dashboard"
    ) {
      setFieldError("overlay_theme", "Choose default or dashboard theme.");
      firstInvalid = firstInvalid || overlayTheme;
    }

    const previews = payload.overlay.image_previews || {};
    if (previews.enabled) {
      if (!previews.allowed_hosts || previews.allowed_hosts.length === 0) {
        setFieldError(
          "overlay_image_previews_allowed_hosts",
          "Add at least one allowed hostname."
        );
        firstInvalid = firstInvalid || imagePreviewsAllowedHosts;
      } else {
        previews.allowed_hosts.forEach(function (host) {
          if (host.indexOf("/") !== -1 || host.indexOf(":") !== -1) {
            setFieldError(
              "overlay_image_previews_allowed_hosts",
              "Each host must be a hostname without path or port."
            );
            firstInvalid = firstInvalid || imagePreviewsAllowedHosts;
          }
        });
      }

      if (
        !Number.isFinite(previews.max_width_px) ||
        previews.max_width_px < 32 ||
        previews.max_width_px > 1920
      ) {
        setFieldError(
          "overlay_image_previews_max_width_px",
          "Max width must be between 32 and 1920 px."
        );
        firstInvalid = firstInvalid || imagePreviewsMaxWidth;
      }

      if (
        !Number.isFinite(previews.max_height_px) ||
        previews.max_height_px < 32 ||
        previews.max_height_px > 1080
      ) {
        setFieldError(
          "overlay_image_previews_max_height_px",
          "Max height must be between 32 and 1080 px."
        );
        firstInvalid = firstInvalid || imagePreviewsMaxHeight;
      }

      if (
        !Number.isFinite(previews.max_per_message) ||
        previews.max_per_message < 1 ||
        previews.max_per_message > 5
      ) {
        setFieldError(
          "overlay_image_previews_max_per_message",
          "Max previews per message must be between 1 and 5."
        );
        firstInvalid = firstInvalid || imagePreviewsMaxPerMessage;
      }
    }

    const sound = payload.admin && payload.admin.message_sound;
    if (!sound || sound.volume < 0 || sound.volume > 1) {
      setFieldError("admin_message_sound_volume", "Volume must be between 0% and 100%.");
      firstInvalid = firstInvalid || messageSoundVolumeInput;
    }
    if (!sound || MESSAGE_SOUND_TYPES.indexOf(sound.sound) === -1) {
      setFieldError("admin_message_sound_sound", "Choose a sound type.");
      firstInvalid = firstInvalid || messageSoundTypeInput;
    }

    if (firstInvalid) {
      openDialogForElement(firstInvalid);
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

  function formatMessageCount(count) {
    if (typeof count !== "number" || count < 0) {
      return "";
    }
    if (count === 0) {
      return "";
    }
    return " · " + String(count) + " msg";
  }

  function platformDetailText(platform) {
    const parts = [];
    if (typeof platform.detail === "string" && platform.detail !== "") {
      parts.push(platform.detail);
    }
    if (typeof platform.last_error === "string" && platform.last_error !== "") {
      parts.push("Last error: " + platform.last_error);
    }
    const countSuffix = formatMessageCount(platform.message_count);
    if (countSuffix !== "") {
      parts.push("Received" + countSuffix);
    }
    return parts.join(" ");
  }

  function renderPlatformDetail(el, platform) {
    const text = platformDetailText(platform);
    if (!el) {
      return;
    }
    if (text !== "") {
      el.hidden = false;
      el.textContent = text;
      return;
    }
    el.hidden = true;
    el.textContent = "";
  }

  function renderStatus(status) {
    const twitch = status.twitch || {};
    renderPlatformStatus(twitchStatus, twitch);
    renderPlatformDetail(twitchDetail, twitch);

    const youtube = status.youtube || {};
    renderPlatformStatus(youtubeStatus, youtube);

    if (youtube.oauth_connected) {
      youtubeOAuthLabel.textContent = "Connected";
    } else {
      youtubeOAuthLabel.textContent = "Not connected";
    }

    renderPlatformDetail(youtubeDetail, youtube);

    const vk = status.vk || {};
    renderPlatformStatus(vkStatus, vk);
    renderPlatformDetail(vkDetail, vk);
  }

  function formatUptime(seconds) {
    if (typeof seconds !== "number" || seconds < 0) {
      return "-";
    }
    if (seconds < 60) {
      return String(seconds) + "s";
    }
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (minutes < 60) {
      return String(minutes) + "m " + String(rem) + "s";
    }
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return String(hours) + "h " + String(remMinutes) + "m";
  }

  function formatMessageCounts(counts) {
    if (!counts || typeof counts !== "object") {
      return "None yet";
    }
    const entries = Object.keys(counts)
      .sort()
      .map(function (platform) {
        return platform + ": " + String(counts[platform]);
      });
    if (entries.length === 0) {
      return "None yet";
    }
    return entries.join(", ");
  }

  function formatRefreshTime(value) {
    if (typeof value !== "string" || value === "") {
      return "Never";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Never";
    }
    return date.toLocaleString();
  }

  function renderEmoteDiagnostics(emoteCache) {
    if (!emoteCache) {
      if (emoteCacheEntries) {
        emoteCacheEntries.textContent = "-";
      }
      if (emoteProviderList) {
        emoteProviderList.textContent = "";
      }
      return;
    }

    if (emoteCacheEntries) {
      const total = emoteCache.total_entries;
      const scopes = emoteCache.total_scopes;
      if (typeof total === "number" && typeof scopes === "number") {
        emoteCacheEntries.textContent = String(total) + " emotes · " + String(scopes) + " scopes";
      } else {
        emoteCacheEntries.textContent = "-";
      }
    }

    if (!emoteProviderList) {
      return;
    }

    emoteProviderList.textContent = "";
    const providers = emoteCache.providers || {};
    const keys = Object.keys(providers).sort();
    if (keys.length === 0) {
      const empty = document.createElement("li");
      empty.className = "provider-list__item provider-list__item--empty";
      appendText(empty, "No provider data yet.");
      emoteProviderList.appendChild(empty);
      return;
    }

    keys.forEach(function (key) {
      const snap = providers[key] || {};
      const item = document.createElement("li");
      item.className = "provider-list__item";

      const title = document.createElement("div");
      title.className = "provider-list__title";
      appendText(title, PROVIDER_LABELS[key] || key);

      const stats = document.createElement("div");
      stats.className = "provider-list__stats";
      const count =
        typeof snap.emote_count === "number" ? String(snap.emote_count) : "0";
      appendText(stats, count + " emotes · refreshed " + formatRefreshTime(snap.last_refresh_at));

      item.appendChild(title);
      item.appendChild(stats);

      if (typeof snap.last_error === "string" && snap.last_error !== "") {
        const err = document.createElement("p");
        err.className = "provider-list__error";
        appendText(err, "Last error: " + snap.last_error);
        item.appendChild(err);
      }

      emoteProviderList.appendChild(item);
    });
  }

  function renderDiagnostics(payload) {
    if (!payload) {
      return;
    }
    if (diagUptime) {
      diagUptime.textContent = formatUptime(payload.uptime_seconds);
    }
    if (diagWsClients) {
      const clients = payload.websocket_clients;
      diagWsClients.textContent =
        typeof clients === "number" ? String(clients) : "-";
    }
    if (diagMessageCounts) {
      diagMessageCounts.textContent = formatMessageCounts(payload.message_counts);
    }
    if (payload.connectors) {
      renderStatus(payload.connectors);
    }
    renderEmoteDiagnostics(payload.emote_cache);
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
        img.replaceWith(document.createTextNode(text));
      },
      { once: true }
    );
  }

  function getImagePreviewSettings() {
    const overlay = currentConfig && currentConfig.overlay;
    const previews = overlay && overlay.image_previews;
    if (!previews || typeof previews !== "object") {
      return {
        enabled: false,
        allowed_hosts: [],
        max_width_px: 320,
        max_height_px: 180,
      };
    }
    return previews;
  }

  function imagePreviewHostAllowed(hostname, allowedHosts) {
    const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
    if (host === "" || !Array.isArray(allowedHosts) || allowedHosts.length === 0) {
      return false;
    }
    return allowedHosts.some(function (allowed) {
      const normalized =
        typeof allowed === "string" ? allowed.trim().toLowerCase() : "";
      return normalized !== "" && (host === normalized || host.endsWith("." + normalized));
    });
  }

  function isPreviewImageURL(rawURL, allowedHosts) {
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
      return imagePreviewHostAllowed(url.hostname, allowedHosts);
    } catch {
      return false;
    }
  }

  function appendEmoteFragment(el, fragment) {
    const text = readFragmentText(fragment);
    const url = safeImageURL(fragment.url);
    if (url === "") {
      appendText(el, text);
      return;
    }

    const img = document.createElement("img");
    img.className = "message-list__emote";
    img.src = url;
    img.alt = text;
    img.title = text;
    img.decoding = "async";
    img.draggable = false;
    img.referrerPolicy = "no-referrer";
    replaceBrokenImageWithText(img, text);
    el.appendChild(img);
  }

  function appendImageLinkFragment(el, fragment) {
    const text = readFragmentText(fragment);
    const previews = getImagePreviewSettings();
    if (!previews.enabled) {
      appendText(el, text);
      return;
    }

    const url = safeImageURL(fragment.url);
    if (url === "" || !isPreviewImageURL(url, previews.allowed_hosts)) {
      appendText(el, text);
      return;
    }

    const img = document.createElement("img");
    img.className = "message-list__image-preview";
    img.src = url;
    img.alt = "chat image";
    img.title = text;
    img.decoding = "async";
    img.loading = "lazy";
    img.draggable = false;
    img.referrerPolicy = "no-referrer";
    if (typeof previews.max_width_px === "number" && previews.max_width_px >= 32) {
      img.style.maxWidth = String(previews.max_width_px) + "px";
    }
    if (typeof previews.max_height_px === "number" && previews.max_height_px >= 32) {
      img.style.maxHeight = String(previews.max_height_px) + "px";
    }
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

  function appendMessageContent(el, msg) {
    const fallbackText = typeof msg.message === "string" ? msg.message : "";
    if (!Array.isArray(msg.fragments) || msg.fragments.length === 0) {
      appendText(el, fallbackText);
      return;
    }

    const before = el.childNodes.length;
    msg.fragments.forEach(function (fragment) {
      appendFragment(el, fragment);
    });
    if (el.childNodes.length === before) {
      appendText(el, fallbackText);
    }
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
    const id = typeof msg.id === "string" ? msg.id.trim() : "";
    if (id !== "") {
      return [
        typeof msg.platform === "string" ? msg.platform : "",
        id,
      ].join("\0");
    }

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
      id: typeof wire.id === "string" ? wire.id : "",
      platform: typeof wire.platform === "string" ? wire.platform : "",
      username: user,
      display_name: displayName,
      message: typeof wire.message === "string" ? wire.message : "",
      fragments: Array.isArray(wire.fragments) ? wire.fragments : [],
      timestamp: typeof wire.timestamp === "string" && wire.timestamp !== ""
        ? wire.timestamp
        : new Date().toISOString(),
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

  function playTone(ctx, start, options) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = options.peak;
    const duration = options.duration;
    osc.type = options.wave || "sine";
    osc.frequency.setValueAtTime(options.freq, start);
    if (options.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(options.freqEnd, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function scheduleMessageSound(ctx, soundType, volume, start) {
    const peak = Math.max(0.0001, volume * 0.18);

    if (soundType === "ping") {
      playTone(ctx, start, { freq: 1200, duration: 0.1, peak: peak });
      return;
    }

    if (soundType === "soft") {
      playTone(ctx, start, { freq: 440, duration: 0.16, peak: peak * 0.7, wave: "triangle" });
      return;
    }

    if (soundType === "alert") {
      playTone(ctx, start, { freq: 880, duration: 0.08, peak: peak });
      playTone(ctx, start + 0.1, { freq: 880, duration: 0.08, peak: peak });
      return;
    }

    playTone(ctx, start, {
      freq: 880,
      freqEnd: 660,
      duration: 0.14,
      peak: peak,
    });
  }

  function playMessageSound(force) {
    const settings = getMessageSoundSettings();
    if (!force && !settings.enabled) {
      return;
    }
    if (settings.volume <= 0) {
      return;
    }

    ensureAudioContext()
      .then(function () {
        scheduleMessageSound(audioCtx, settings.sound, settings.volume, audioCtx.currentTime);
      })
      .catch(function () {
        /* autoplay policy or missing Web Audio */
      });
  }

  function maybePlayMessageSound(messages) {
    if (!soundReady || !getMessageSoundSettings().enabled || !hasNewMessages(messages)) {
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
    platform.className = "message-list__platform";
    appendText(platform, typeof msg.platform === "string" ? msg.platform : "");

    const time = document.createElement("time");
    time.className = "message-list__time";
    if (typeof msg.timestamp === "string") {
      time.dateTime = msg.timestamp;
      appendText(time, new Date(msg.timestamp).toLocaleTimeString());
    }

    meta.appendChild(user);
    meta.appendChild(platform);
    meta.appendChild(time);

    const text = document.createElement("p");
    text.className = "message-list__text";
    appendMessageContent(text, msg);

    item.appendChild(meta);
    item.appendChild(text);
    return item;
  }

  function scrollMessagesToBottom() {
    const panel = recentMessages ? recentMessages.closest(".message-panel") : null;
    if (!panel) {
      return;
    }
    window.requestAnimationFrame(function () {
      panel.scrollTop = panel.scrollHeight;
    });
  }

  function appendRecentMessage(msg) {
    recentMessagesEmpty.hidden = true;
    recentMessages.appendChild(buildMessageListItem(msg));
    while (recentMessages.children.length > RECENT_MESSAGE_LIMIT) {
      recentMessages.removeChild(recentMessages.firstChild);
    }
    scrollMessagesToBottom();
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
    scrollMessagesToBottom();
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

    if (soundReady && getMessageSoundSettings().enabled) {
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
    messageSoundEnabledInput.addEventListener("change", function () {
      if (messageSoundEnabledInput.checked) {
        ensureAudioContext().catch(function () {
          /* user must use Test sound if blocked */
        });
      }
    });

    messageSoundVolumeInput.addEventListener("input", function () {
      const volumePercent = clampVolumePercent(
        Number.parseInt(messageSoundVolumeInput.value, 10)
      );
      messageSoundVolumeLabel.textContent = String(volumePercent) + "%";
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
    const response = await fetch(apiURL("/api/diagnostics"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    renderDiagnostics(payload);
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
    if (saveInFlight) {
      return;
    }
    hideBanner();
    clearFieldErrors();

    const payload = buildPayload();
    if (!validateClient(payload)) {
      showBanner("error", "Check the highlighted fields.");
      return;
    }

    saveInFlight = true;
    renderSettingsState();

    try {
      const response = await fetch(apiURL("/api/config"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJSON(response);
      if (!response.ok) {
        const firstInvalid = body && body.fields ? applyServerFieldErrors(body.fields) : null;
        if (firstInvalid) {
          openDialogForElement(firstInvalid);
          firstInvalid.focus();
        }
        showBanner("error", mapHTTPError(response.status, body && body.error));
        return;
      }

      applyConfig(body);
      if (vkChannel) {
        vkChannel.value = readVkSettings().channel;
      }
      showBanner("success", "Settings saved.");
      closeOpenDialogs();
      await loadStatus();
    } catch {
      showBanner("error", "Cannot reach Chat Relay — is it running?");
    } finally {
      saveInFlight = false;
      renderSettingsState();
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

  function initSettingsDialogs() {
    document.querySelectorAll("[data-dialog-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = document.getElementById(button.getAttribute("data-dialog-target"));
        if (dialog && typeof dialog.showModal === "function") {
          dialog.showModal();
        }
      });
    });

    document.querySelectorAll("[data-dialog-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = button.closest("dialog");
        if (dialog) {
          dialog.close();
        }
      });
    });

    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
          dialog.close();
        }
      });
    });
  }

  Object.keys(fieldInputs).forEach(bindFieldClear);

  if (vkChannel) {
    vkChannel.addEventListener("blur", function () {
      const normalized = normalizeVkChannel(vkChannel.value);
      if (normalized !== vkChannel.value.trim().toLowerCase()) {
        vkChannel.value = normalized;
      }
    });
  }

  form.addEventListener("submit", saveSettings);
  form.addEventListener("input", markSettingsDirty);
  form.addEventListener("change", markSettingsDirty);
  refreshMessages.addEventListener("click", function () {
    loadRecentMessages().catch(function () {
      showBanner("error", "Cannot load recent messages.");
    });
  });

  handleOAuthQuery();
  initSidebarToggle();
  initSettingsDialogs();
  initMessageSoundControls();

  renderSettingsState();

  refreshAll().catch(function () {
    if (!currentConfig) {
      markSettingsUnavailable();
    }
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
