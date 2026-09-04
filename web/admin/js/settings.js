import * as dom from './dom.js';
import { state } from './state.js';
import {
  MESSAGE_SOUND_TYPES,
  OVERLAY_FONT_SIZE_MIN,
  OVERLAY_FONT_SIZE_MAX,
  OVERLAY_THEMES,
  RECENT_MESSAGE_LIMIT,
} from './constants.js';
import { apiURL, readJSON, mapHTTPError } from './api.js';
import { showBanner, hideBanner } from './ui-shell.js';
import { openDialogForElement, closeOpenDialogs } from './dialogs.js';
import {
  renderSettingsState,
  markSettingsClean,
  clearFieldErrors,
  applyServerFieldErrors,
  setFieldError,
} from './ui-shell.js';
import {
  scheduleOverlayPreviewRefresh,
  overlayDisplaySettingsChanged,
} from './overlay-preview.js';
import {
  applyMessageSoundFromConfig,
  getMessageSoundSettings,
} from './sound.js';
import {
  applyOverlayAppearance,
  collectOverlayAppearance,
} from './overlay-appearance.js';
import {
  renderRecentMessages,
  maybePlayMessageSound,
  trackMessages,
} from './messages.js';
import { renderDiagnostics } from './status.js';
import { applyAdminLocale, localeFromConfig, t } from './i18n-ui.js';

export function normalizeVkChannel(raw) {
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

export function updateYouTubeConnectionModeUI() {
    const isPageMode =
      dom.youtubeConnectionMode && dom.youtubeConnectionMode.value === "page";
    if (dom.youtubePageFields) {
      dom.youtubePageFields.hidden = !isPageMode;
    }
    if (dom.youtubeApiFields) {
      dom.youtubeApiFields.hidden = isPageMode;
    }
    if (dom.youtubeConnect) {
      dom.youtubeConnect.hidden = isPageMode;
    }
  }

export function readVkSettings() {
    const enabledInput = document.getElementById("vk-enabled");
    const channelInput = document.getElementById("vk-channel");
    let enabled = enabledInput ? enabledInput.checked : false;
    let channel = channelInput ? normalizeVkChannel(channelInput.value) : "";

    if (dom.form) {
      const formData = new FormData(dom.form);
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

export function parseAllowedHostsText(raw) {
    return String(raw || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim().toLowerCase();
      })
      .filter(function (host) {
        return host !== "";
      });
  }

export function formatAllowedHostsText(hosts) {
    if (!hosts || !Array.isArray(hosts)) {
      return "";
    }
    return hosts.join("\n");
  }

export function applyRichChatFromConfig(overlay) {
    const emotes = overlay.emotes || {};
    dom.emotesTwitch.checked = emotes.twitch !== false;
    if (dom.emotesYouTube) {
      dom.emotesYouTube.checked = emotes.youtube !== false;
    }
    if (dom.emotesVK) {
      dom.emotesVK.checked = emotes.vk !== false;
    }
    dom.emotesFFZ.checked = emotes.ffz !== false;
    dom.emotesBTTV.checked = emotes.bttv !== false;
    dom.emotesSevenTV.checked = emotes["7tv"] !== false;

    const previews = overlay.image_previews || {};
    dom.imagePreviewsEnabled.checked = Boolean(previews.enabled);
    dom.imagePreviewsAllowedHosts.value = formatAllowedHostsText(previews.allowed_hosts);
    dom.imagePreviewsMaxWidth.value = String(
      typeof previews.max_width_px === "number" ? previews.max_width_px : 320
    );
    dom.imagePreviewsMaxHeight.value = String(
      typeof previews.max_height_px === "number" ? previews.max_height_px : 180
    );
    dom.imagePreviewsMaxPerMessage.value = String(
      typeof previews.max_per_message === "number" ? previews.max_per_message : 1
    );
  }

export function getRichChatSettings() {
    return {
      emotes: {
        twitch: dom.emotesTwitch.checked,
        youtube: dom.emotesYouTube ? dom.emotesYouTube.checked : true,
        vk: dom.emotesVK ? dom.emotesVK.checked : true,
        ffz: dom.emotesFFZ.checked,
        bttv: dom.emotesBTTV.checked,
        "7tv": dom.emotesSevenTV.checked,
      },
      image_previews: {
        enabled: dom.imagePreviewsEnabled.checked,
        allowed_hosts: parseAllowedHostsText(dom.imagePreviewsAllowedHosts.value),
        max_width_px: Number.parseInt(dom.imagePreviewsMaxWidth.value, 10),
        max_height_px: Number.parseInt(dom.imagePreviewsMaxHeight.value, 10),
        max_per_message: Number.parseInt(dom.imagePreviewsMaxPerMessage.value, 10),
      },
    };
  }

export function proxyRequired(payload) {
    return Boolean(
      (payload.youtube && payload.youtube.use_proxy) ||
      (payload.vk && payload.vk.use_proxy)
    );
  }

export function validateSocks5Address(address) {
    const trimmed = String(address || "").trim();
    if (trimmed === "") {
      return false;
    }
    const match = trimmed.match(/^\[([^\]]+)\]:(\d+)$|^([^:]+):(\d+)$/);
    if (!match) {
      return false;
    }
    const port = Number.parseInt(match[2] || match[4], 10);
    return Number.isFinite(port) && port >= 1 && port <= 65535;
  }

export function applyConfig(config) {
    const previousLocale = state.currentConfig && state.currentConfig.admin
      ? state.currentConfig.admin.time_locale
      : "";
    state.currentConfig = config;
    dom.twitchEnabled.checked = Boolean(config.twitch && config.twitch.enabled);
    dom.twitchChannel.value = config.twitch && config.twitch.channel ? config.twitch.channel : "";

    const network = config.network || {};
    const socks5 = network.socks5 || {};
    if (dom.networkSocks5Address) {
      dom.networkSocks5Address.value = socks5.address || "";
    }
    if (dom.networkSocks5Username) {
      dom.networkSocks5Username.value = socks5.username || "";
    }
    if (dom.networkSocks5Password) {
      dom.networkSocks5Password.value = "";
    }
    if (dom.serverPortInput) {
      dom.serverPortInput.value = String(
        typeof config.server_port === "number" ? config.server_port : 17877
      );
    }

    const overlay = config.overlay || {};
    applyOverlayAppearance(overlay);
    applyRichChatFromConfig(overlay);

    if (config.youtube) {
      dom.youtubeEnabled.checked = Boolean(config.youtube.enabled);
      if (dom.youtubeConnectionMode) {
        const connectionMode = config.youtube.connection_mode || "page";
        dom.youtubeConnectionMode.value =
          connectionMode === "page" ? "page" : "api";
      }
      if (dom.youtubeChannelHandle) {
        dom.youtubeChannelHandle.value = config.youtube.channel_handle || "";
      }
      if (dom.youtubeVideoInput) {
        dom.youtubeVideoInput.value = config.youtube.video_input || "";
      }
      if (dom.youtubeChatMode) {
        const mode = config.youtube.chat_mode || "stream";
        dom.youtubeChatMode.value =
          mode === "poll" || mode === "auto" ? mode : "stream";
      }
      const oauth = config.youtube.oauth || {};
      dom.youtubeClientId.value = oauth.client_id || "";
      dom.youtubeClientSecret.value = "";
      if (dom.youtubeUseProxy) {
        dom.youtubeUseProxy.checked = Boolean(config.youtube.use_proxy);
      }
      updateYouTubeConnectionModeUI();
    }

    const vk = config.vk || { enabled: false, channel: "", use_proxy: false };
    if (dom.vkEnabled) {
      dom.vkEnabled.checked = Boolean(vk.enabled);
    }
    if (dom.vkChannel) {
      dom.vkChannel.value = vk.channel ? vk.channel : "";
    }
    if (dom.vkUseProxy) {
      dom.vkUseProxy.checked = Boolean(vk.use_proxy);
    }

    applyMessageSoundFromConfig(config);
    if (dom.timeLocaleInput) {
      dom.timeLocaleInput.value = localeFromConfig(config);
    }
    if (dom.activityIntervalSecondsInput) {
      dom.activityIntervalSecondsInput.value = String(
        typeof config.activity_interval_seconds === "number" ? config.activity_interval_seconds : 300
      );
    }
    if (dom.activitySessionLimitInput) {
      dom.activitySessionLimitInput.value = String(
        typeof config.activity_session_limit === "number" ? config.activity_session_limit : 10
      );
    }
    if (dom.activityXPInput) {
      dom.activityXPInput.value = String(
        typeof config.activity_xp === "number" ? config.activity_xp : 1
      );
    }
    if (dom.dayResetHourInput) {
      dom.dayResetHourInput.value = String(
        typeof config.day_reset_hour === "number" ? config.day_reset_hour : 6
      );
    }
    if (dom.hideCommandMessagesInput) {
      dom.hideCommandMessagesInput.checked = Boolean(config.hide_command_messages);
    }
    if (dom.streamerDisplayNameInput) {
      dom.streamerDisplayNameInput.value = String(config.streamer_display_name || "");
    }
    const nextLocale = localeFromConfig(config);
    if (previousLocale !== nextLocale && state.recentMessageCache.length > 0) {
      renderRecentMessages(state.recentMessageCache, { force: true });
    }
    applyAdminLocale(nextLocale);
    markSettingsClean();
    scheduleOverlayPreviewRefresh();
    document.dispatchEvent(new CustomEvent("admin-config-applied", { detail: { config: config } }));
  }

export function buildPayload() {
    const richChat = getRichChatSettings();
    const appearance = collectOverlayAppearance();
    return {
      server_port: dom.serverPortInput
        ? Number.parseInt(dom.serverPortInput.value, 10)
        : state.currentConfig
          ? state.currentConfig.server_port
          : 17877,
      activity_interval_seconds: dom.activityIntervalSecondsInput
        ? Number.parseInt(dom.activityIntervalSecondsInput.value, 10)
        : 300,
      activity_session_limit: dom.activitySessionLimitInput
        ? Number.parseInt(dom.activitySessionLimitInput.value, 10)
        : 10,
      activity_xp: dom.activityXPInput ? Number.parseInt(dom.activityXPInput.value, 10) : 1,
      day_reset_hour: dom.dayResetHourInput
        ? Number.parseInt(dom.dayResetHourInput.value, 10)
        : 6,
      hide_command_messages: dom.hideCommandMessagesInput
        ? dom.hideCommandMessagesInput.checked
        : false,
      streamer_display_name: dom.streamerDisplayNameInput
        ? dom.streamerDisplayNameInput.value.trim()
        : "",
      network: {
        socks5: {
          address: dom.networkSocks5Address ? dom.networkSocks5Address.value.trim() : "",
          username: dom.networkSocks5Username ? dom.networkSocks5Username.value.trim() : "",
          password: dom.networkSocks5Password ? dom.networkSocks5Password.value : "",
        },
      },
      twitch: {
        enabled: dom.twitchEnabled.checked,
        channel: dom.twitchChannel.value.trim().toLowerCase(),
      },
      youtube: {
        enabled: dom.youtubeEnabled.checked,
        connection_mode: dom.youtubeConnectionMode
          ? dom.youtubeConnectionMode.value
          : "page",
        video_input: dom.youtubeVideoInput ? dom.youtubeVideoInput.value.trim() : "",
        channel_handle: dom.youtubeChannelHandle ? dom.youtubeChannelHandle.value.trim() : "",
        chat_mode: dom.youtubeChatMode ? dom.youtubeChatMode.value : "stream",
        use_proxy: dom.youtubeUseProxy ? dom.youtubeUseProxy.checked : false,
        oauth: {
          client_id: dom.youtubeClientId.value.trim(),
          client_secret: dom.youtubeClientSecret.value,
        },
      },
      vk: Object.assign(readVkSettings(), {
        use_proxy: dom.vkUseProxy ? dom.vkUseProxy.checked : false,
      }),
      overlay: Object.assign({}, appearance, {
        emotes: richChat.emotes,
        image_previews: richChat.image_previews,
      }),
      admin: {
        time_locale: dom.timeLocaleInput && dom.timeLocaleInput.value === "en-GB"
          ? "en-GB"
          : "ru-RU",
        message_sound: getMessageSoundSettings(),
      },
    };
  }

export async function fetchPublicConfig() {
    const response = await fetch(apiURL("/api/config"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    return payload;
  }

export function composeConfigUpdateFromServer(serverConfig, overlayAppearance) {
    const latest = serverConfig || {};
    const overlay = latest.overlay || {};
    const youtube = latest.youtube || {};
    const oauth = youtube.oauth || {};
    const network = latest.network || {};
    const socks5 = network.socks5 || {};
    return {
      server_port: latest.server_port,
      activity_interval_seconds: latest.activity_interval_seconds,
      activity_session_limit: latest.activity_session_limit,
      activity_xp: latest.activity_xp,
      day_reset_hour: latest.day_reset_hour,
      hide_command_messages: Boolean(latest.hide_command_messages),
      streamer_display_name: String(latest.streamer_display_name || "").trim(),
      network: {
        socks5: {
          address: socks5.address || "",
          username: socks5.username || "",
          password: "",
        },
      },
      twitch: latest.twitch || { enabled: false, channel: "" },
      youtube: {
        enabled: Boolean(youtube.enabled),
        connection_mode: youtube.connection_mode || "page",
        video_input: youtube.video_input || "",
        channel_handle: youtube.channel_handle || "",
        chat_mode: youtube.chat_mode || "stream",
        use_proxy: Boolean(youtube.use_proxy),
        oauth: {
          client_id: oauth.client_id || "",
          client_secret: "",
        },
      },
      vk: latest.vk || { enabled: false, channel: "", use_proxy: false },
      overlay: Object.assign({}, overlayAppearance, {
        active_preset_id:
          overlay.active_preset_id || overlayAppearance.active_preset_id || "default",
        presets:
          Array.isArray(overlayAppearance.presets) && overlayAppearance.presets.length > 0
            ? overlayAppearance.presets
            : overlay.presets || [],
        emotes: overlay.emotes || {},
        image_previews: overlay.image_previews || {},
      }),
      admin: latest.admin || {},
    };
  }

export function validateClient(payload, options) {
    clearFieldErrors();
    let firstInvalid = null;

    if (proxyRequired(payload)) {
      if (!validateSocks5Address(payload.network.socks5.address)) {
        setFieldError(
          "network_socks5_address",
          "Enter a valid host:port address when a platform uses the proxy."
        );
        firstInvalid = dom.networkSocks5Address;
      }
    }

    if (
      !Number.isFinite(payload.server_port) ||
      payload.server_port < 1 ||
      payload.server_port > 65535
    ) {
      setFieldError("server_port", "Port must be between 1 and 65535.");
      firstInvalid = firstInvalid || dom.serverPortInput;
    }

    if (payload.twitch.enabled && payload.twitch.channel === "") {
      setFieldError("twitch_channel", "Channel is required when Twitch is enabled.");
      firstInvalid = firstInvalid || dom.twitchChannel;
    } else if (
      payload.twitch.channel !== "" &&
      !/^[a-z0-9_]{1,25}$/.test(payload.twitch.channel)
    ) {
      setFieldError(
        "twitch_channel",
        "Use a lowercase Twitch login (letters, numbers, underscore)."
      );
      firstInvalid = firstInvalid || dom.twitchChannel;
    }

    if (payload.vk.enabled && payload.vk.channel === "") {
      setFieldError("vk_channel", "Channel slug is required when VK Live is enabled.");
      firstInvalid = firstInvalid || dom.vkChannel;
    } else if (
      payload.vk.enabled &&
      payload.vk.channel !== "" &&
      !/^[a-z0-9_-]{1,64}$/.test(payload.vk.channel)
    ) {
      setFieldError(
        "vk_channel",
        "Use a lowercase channel slug (letters, numbers, underscore, hyphen)."
      );
      firstInvalid = firstInvalid || dom.vkChannel;
    }

    if (!Number.isFinite(payload.overlay.max_messages) || payload.overlay.max_messages < 1) {
      setFieldError("overlay_max_messages", "Enter at least 1 message.");
      firstInvalid = firstInvalid || dom.overlayMaxMessages;
    }

    if (
      !Number.isFinite(payload.overlay.message_ttl_seconds) ||
      payload.overlay.message_ttl_seconds < 0
    ) {
      setFieldError("overlay_message_ttl_seconds", "TTL must be 0 or greater.");
      firstInvalid = firstInvalid || dom.overlayMessageTTL;
    }

    if (
      !Number.isFinite(payload.overlay.font_size_px) ||
      payload.overlay.font_size_px < OVERLAY_FONT_SIZE_MIN ||
      payload.overlay.font_size_px > OVERLAY_FONT_SIZE_MAX
    ) {
      setFieldError(
        "overlay_font_size_px",
        "Font size must be between " + OVERLAY_FONT_SIZE_MIN + " and " + OVERLAY_FONT_SIZE_MAX + " px."
      );
      firstInvalid = firstInvalid || dom.overlayFontSize;
    }

    (payload.overlay.presets || []).some(function (preset) {
      const surface = preset && preset.surfaces && preset.surfaces.leaderboard;
      const font = surface && surface.font_size_px;
      if (
        font != null &&
        font !== 0 &&
        (!Number.isFinite(font) || font < OVERLAY_FONT_SIZE_MIN || font > OVERLAY_FONT_SIZE_MAX)
      ) {
        setFieldError(
          "overlay_leaderboard_font_size_px",
          "Font size must be between " + OVERLAY_FONT_SIZE_MIN + " and " + OVERLAY_FONT_SIZE_MAX + " px."
        );
        firstInvalid = firstInvalid || dom.overlayLeaderboardFontSize;
        return true;
      }
      return false;
    });

    (payload.overlay.presets || []).some(function (preset) {
      const alerts = preset && preset.surfaces && preset.surfaces.alerts;
      const size = alerts && alerts.image_size_pct;
      if (
        size != null &&
        size !== 0 &&
        (!Number.isFinite(size) || size < 25 || size > 300)
      ) {
        setFieldError(
          "overlay_alerts_image_size_pct",
          "Image size must be between 25% and 300%."
        );
        firstInvalid = firstInvalid || dom.overlayAlertsImageSize;
        return true;
      }
      return false;
    });

    if (
      payload.overlay.display_mode !== "normal" &&
      payload.overlay.display_mode !== "compact"
    ) {
      setFieldError("overlay_display_mode", "Choose comfortable or compact spacing.");
      firstInvalid = firstInvalid || dom.overlayDisplayMode;
    }

    if (
      OVERLAY_THEMES.indexOf(payload.overlay.theme) === -1
    ) {
      setFieldError("overlay_theme", "Choose a supported overlay theme.");
      firstInvalid = firstInvalid || dom.overlayTheme;
    }

    const previews = payload.overlay.image_previews || {};
    if (previews.enabled) {
      if (!previews.allowed_hosts || previews.allowed_hosts.length === 0) {
        setFieldError(
          "overlay_image_previews_allowed_hosts",
          "Add at least one allowed hostname."
        );
        firstInvalid = firstInvalid || dom.imagePreviewsAllowedHosts;
      } else {
        previews.allowed_hosts.forEach(function (host) {
          if (host.indexOf("/") !== -1 || host.indexOf(":") !== -1) {
            setFieldError(
              "overlay_image_previews_allowed_hosts",
              "Each host must be a hostname without path or port."
            );
            firstInvalid = firstInvalid || dom.imagePreviewsAllowedHosts;
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
        firstInvalid = firstInvalid || dom.imagePreviewsMaxWidth;
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
        firstInvalid = firstInvalid || dom.imagePreviewsMaxHeight;
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
        firstInvalid = firstInvalid || dom.imagePreviewsMaxPerMessage;
      }
    }

    const sound = payload.admin && payload.admin.message_sound;
    if (!sound || sound.volume < 0 || sound.volume > 1) {
      setFieldError("admin_message_sound_volume", "Volume must be between 0% and 100%.");
      firstInvalid = firstInvalid || dom.messageSoundVolumeInput;
    }
    if (!sound || MESSAGE_SOUND_TYPES.indexOf(sound.sound) === -1) {
      setFieldError("admin_message_sound_sound", "Choose a sound type.");
      firstInvalid = firstInvalid || dom.messageSoundTypeInput;
    }

    if (
      !Number.isFinite(payload.activity_interval_seconds) ||
      payload.activity_interval_seconds < 0
    ) {
      setFieldError("activity_interval_seconds", "Activity interval must be 0 or greater.");
      firstInvalid = firstInvalid || dom.activityIntervalSecondsInput;
    }
    if (
      !Number.isFinite(payload.activity_session_limit) ||
      payload.activity_session_limit < 0
    ) {
      setFieldError("activity_session_limit", "Activity session limit must be 0 or greater.");
      firstInvalid = firstInvalid || dom.activitySessionLimitInput;
    }
    if (!Number.isFinite(payload.activity_xp) || payload.activity_xp < 0) {
      setFieldError("activity_xp", "Activity XP must be 0 or greater.");
      firstInvalid = firstInvalid || dom.activityXPInput;
    }

    if (
      !Number.isFinite(payload.day_reset_hour) ||
      payload.day_reset_hour < 0 ||
      payload.day_reset_hour > 23
    ) {
      setFieldError("day_reset_hour", "Day reset hour must be between 0 and 23.");
      firstInvalid = firstInvalid || dom.dayResetHourInput;
    }

    const streamerName = String(payload.streamer_display_name || "");
    if (Array.from(streamerName).length > 64) {
      setFieldError(
        "streamer_display_name",
        "Streamer display name must be at most 64 characters."
      );
      firstInvalid = firstInvalid || dom.streamerDisplayNameInput;
    }

    if (firstInvalid) {
      if (!options || !options.focusStudio) {
        openDialogForElement(firstInvalid);
      }
      firstInvalid.focus();
      return false;
    }

    return true;
  }

export async function loadConfig() {
    const response = await fetch(apiURL("/api/config"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    applyConfig(payload);
  }

export async function loadStatus() {
    const response = await fetch(apiURL("/api/diagnostics"));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    renderDiagnostics(payload);
  }

const YOUTUBE_OAUTH_WAIT_MS = 5 * 60 * 1000;
const YOUTUBE_OAUTH_POLL_MS = 1000;

export async function startYouTubeOAuth() {
    if (state.youtubeOAuthInFlight) {
      return;
    }

    hideBanner();
    state.youtubeOAuthInFlight = true;

    try {
      const response = await fetch(apiURL("/api/youtube/oauth/start"), {
        method: "POST",
      });
      const body = await readJSON(response);
      if (!response.ok) {
        showBanner("error", mapHTTPError(response.status, body && body.error));
        return;
      }

      if (body.opened) {
        showBanner("info", t("banner.youtubeSignIn"));
      } else if (body.authorization_url) {
        showBanner(
          "info",
          t("banner.youtubeOpenLink", { url: body.authorization_url })
        );
      } else {
        showBanner("error", t("banner.youtubeBrowserFailed"));
        return;
      }

      await waitForYouTubeOAuthConnected();
    } catch {
      showBanner("error", t("banner.cannotReach"));
    } finally {
      state.youtubeOAuthInFlight = false;
    }
  }

async function waitForYouTubeOAuthConnected() {
    const deadline = Date.now() + YOUTUBE_OAUTH_WAIT_MS;
    while (Date.now() < deadline) {
      await loadStatus();
      if (state.youtubeOAuthConnected) {
        showBanner("success", t("banner.youtubeConnected"));
        return;
      }
      await new Promise(function (resolve) {
        window.setTimeout(resolve, YOUTUBE_OAUTH_POLL_MS);
      });
    }
    showBanner("error", t("banner.youtubeTimeout"));
  }

export async function loadRecentMessages(options) {
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
    state.soundReady = true;
  }

export async function refreshAll() {
    await Promise.all([loadConfig(), loadStatus(), loadRecentMessages()]);
  }

export async function saveSettings(event) {
    event.preventDefault();
    if (state.saveInFlight) {
      return;
    }
    hideBanner();
    clearFieldErrors();

    const payload = buildPayload();
    if (!validateClient(payload)) {
      showBanner("error", t("banner.checkFields"));
      return;
    }

    state.saveInFlight = true;
    renderSettingsState();

    try {
      const response = await fetch(apiURL("/api/config/update"), {
        method: "POST",
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

      const overlayDisplayChanged = overlayDisplaySettingsChanged(payload);
      applyConfig(body);
      if (dom.vkChannel) {
        dom.vkChannel.value = readVkSettings().channel;
      }
      const savedMessage = overlayDisplayChanged
        ? t("banner.settingsSavedObs")
        : t("banner.settingsSaved");
      showBanner("success", savedMessage);
      closeOpenDialogs();
      await loadStatus();
    } catch {
      showBanner("error", t("banner.cannotReach"));
    } finally {
      state.saveInFlight = false;
      renderSettingsState();
    }
  }

export function bindFieldClear(fieldKey) {
    const input = dom.fieldInputs[fieldKey];
    if (!input) {
      return;
    }
    input.addEventListener("input", function () {
      const el = dom.fieldErrors[fieldKey];
      if (el && !el.hidden) {
        el.hidden = true;
        el.textContent = "";
        input.removeAttribute("aria-invalid");
        const hintID = input.dataset.fieldHintId;
        if (hintID) {
          input.setAttribute("aria-describedby", hintID);
        } else {
          input.removeAttribute("aria-describedby");
        }
      }
    });
  }
