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
  const youtubeConnectionMode = document.getElementById("youtube-connection-mode");
  const youtubeChannelHandle = document.getElementById("youtube-channel-handle");
  const youtubeVideoInput = document.getElementById("youtube-video-input");
  const youtubePageFields = document.getElementById("youtube-page-fields");
  const youtubeApiFields = document.getElementById("youtube-api-fields");
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
  const overlayDialog = document.getElementById("overlay-dialog");
  const overlayPreviewFrame = document.getElementById("overlay-preview-frame");
  const overlayPreviewStage = document.getElementById("overlay-preview-stage");
  const overlayPreviewViewport = document.getElementById("overlay-preview-viewport");
  const overlayPreviewMode = document.getElementById("overlay-preview-mode");
  const overlayPreviewSize = document.getElementById("overlay-preview-size");
  const overlayPreviewWidth = document.getElementById("overlay-preview-width");
  const overlayPreviewHeight = document.getElementById("overlay-preview-height");
  const overlayPreviewBackground = document.getElementById("overlay-preview-background");
  const overlayPreviewReplay = document.getElementById("overlay-preview-replay");
  const overlayPreviewOpen = document.getElementById("overlay-preview-open");
  const overlayPreviewNote = document.getElementById("overlay-preview-note");
  const obsSetupTab = document.getElementById("obs-setup-tab");
  const obsAppearanceTab = document.getElementById("obs-appearance-tab");
  const obsSetupPanel = document.getElementById("obs-setup-panel");
  const obsAppearancePanel = document.getElementById("obs-appearance-panel");
  const obsCopyStatus = document.getElementById("obs-copy-status");
  const obsOverlayOpen = document.getElementById("obs-overlay-open");
  const obsDockOpen = document.getElementById("obs-dock-open");
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
  const statusErrorPopover = document.getElementById("status-error-popover");

  const MESSAGE_SOUND_TYPES = ["chime", "ping", "soft", "alert"];
  const RECENT_MESSAGE_LIMIT = 20;
  const MESSAGE_SCROLL_THRESHOLD_PX = 48;
  const BANNER_SUCCESS_DISMISS_MS = 4000;
  const OVERLAY_FONT_SIZE_MIN = 12;
  const OVERLAY_FONT_SIZE_MAX = 48;
  const OVERLAY_THEMES = ["default", "dashboard", "cockpit_panel", "cockpit_popups"];
  const INITIAL_WS_RECONNECT_MS = 1000;
  const MAX_WS_RECONNECT_MS = 30000;
  const SIDEBAR_COLLAPSED_KEY = "commRelay.sidebarCollapsed";
  const OVERLAY_PREVIEW_MODE_KEY = "commRelay.overlayPreview.mode";
  const OVERLAY_PREVIEW_BACKGROUND_KEY = "commRelay.overlayPreview.background";
  const OVERLAY_PREVIEW_WIDTH_KEY = "commRelay.overlayPreview.width";
  const OVERLAY_PREVIEW_HEIGHT_KEY = "commRelay.overlayPreview.height";
  const OVERLAY_PREVIEW_REFRESH_MS = 120;
  const OVERLAY_PREVIEW_DEFAULT_WIDTH = 640;
  const OVERLAY_PREVIEW_DEFAULT_HEIGHT = 360;
  const OVERLAY_PREVIEW_WIDTH_MIN = 240;
  const OVERLAY_PREVIEW_WIDTH_MAX = 3840;
  const OVERLAY_PREVIEW_HEIGHT_MIN = 180;
  const OVERLAY_PREVIEW_HEIGHT_MAX = 2160;
  const OVERLAY_PREVIEW_SIZES = {
    "640x360": [640, 360],
    "800x600": [800, 600],
    "1280x720": [1280, 720],
    "480x720": [480, 720],
  };

  const fieldErrors = {
    twitch_channel: document.getElementById("twitch-channel-error"),
    vk_channel: document.getElementById("vk-channel-error"),
    youtube_video_input: document.getElementById("youtube-video-input-error"),
    youtube_channel_handle: document.getElementById("youtube-channel-handle-error"),
    youtube_connection_mode: document.getElementById("youtube-channel-handle-error"),
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
    youtube_video_input: youtubeVideoInput,
    youtube_channel_handle: youtubeChannelHandle,
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
  let renderedMessagesFingerprint = "";
  let wsSocket = null;
  let wsShouldRun = true;
  let wsReconnectDelayMs = INITIAL_WS_RECONNECT_MS;
  let wsReconnectTimer = null;
  let audioCtx = null;
  let bannerTimer = null;
  let activeErrorTrigger = null;
  let errorPopoverPinned = false;
  let overlayPreviewRefreshTimer = null;
  let overlayPreviewRevision = 0;
  let overlayPreviewResizeObserver = null;
  let obsCopyFeedbackTimer = null;
  let obsCopyFeedbackButton = null;

  function apiURL(path) {
    return window.location.origin + path;
  }

  function updateOBSSetupURLs() {
    document.querySelectorAll("[data-obs-url-path]").forEach(function (input) {
      input.value = apiURL(input.dataset.obsUrlPath || "/");
    });
    if (obsOverlayOpen) {
      obsOverlayOpen.href = apiURL("/overlay");
    }
    if (obsDockOpen) {
      obsDockOpen.href = apiURL("/dock/messages");
    }
  }

  function resetOBSCopyFeedback() {
    if (obsCopyFeedbackTimer !== null) {
      window.clearTimeout(obsCopyFeedbackTimer);
      obsCopyFeedbackTimer = null;
    }
    if (obsCopyFeedbackButton) {
      obsCopyFeedbackButton.textContent = obsCopyFeedbackButton.dataset.copyDefaultText || "Copy URL";
      obsCopyFeedbackButton = null;
    }
  }

  function showOBSCopyFeedback(button, message, copied) {
    resetOBSCopyFeedback();
    button.dataset.copyDefaultText = button.dataset.copyDefaultText || button.textContent;
    button.textContent = copied ? "Copied" : "Copy failed";
    obsCopyFeedbackButton = button;
    if (obsCopyStatus) {
      obsCopyStatus.textContent = message;
      obsCopyStatus.classList.toggle("obs-copy-status--error", !copied);
    }
    obsCopyFeedbackTimer = window.setTimeout(function () {
      resetOBSCopyFeedback();
    }, 2500);
  }

  function fallbackCopyFromInput(input) {
    try {
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      const copied = document.execCommand("copy");
      if (copied) {
        input.setSelectionRange(0, 0);
      }
      return copied;
    } catch {
      return false;
    }
  }

  async function copyOBSURL(input) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(input.value);
        return true;
      } catch {
        return fallbackCopyFromInput(input);
      }
    }
    return fallbackCopyFromInput(input);
  }

  function setOBSSection(section, options) {
    if (!obsSetupTab || !obsAppearanceTab || !obsSetupPanel || !obsAppearancePanel) {
      return;
    }
    const showAppearance = section === "appearance";
    obsSetupTab.setAttribute("aria-selected", showAppearance ? "false" : "true");
    obsSetupTab.tabIndex = showAppearance ? -1 : 0;
    obsAppearanceTab.setAttribute("aria-selected", showAppearance ? "true" : "false");
    obsAppearanceTab.tabIndex = showAppearance ? 0 : -1;
    obsSetupPanel.hidden = showAppearance;
    obsAppearancePanel.hidden = !showAppearance;
    document.querySelectorAll("[data-obs-appearance-only]").forEach(function (element) {
      element.hidden = !showAppearance;
    });

    if (overlayDialog && overlayDialog.open) {
      if (showAppearance) {
        mountOverlayPreview();
      } else {
        unmountOverlayPreview();
      }
    }

    if (options && options.focusTab) {
      (showAppearance ? obsAppearanceTab : obsSetupTab).focus();
    }
  }

  function initOBSSetup() {
    if (!overlayDialog || !obsSetupTab || !obsAppearanceTab) {
      return;
    }

    updateOBSSetupURLs();
    setOBSSection("setup");

    overlayDialog.querySelectorAll("[data-obs-section]").forEach(function (button) {
      button.addEventListener("click", function () {
        setOBSSection(button.dataset.obsSection, {
          focusTab: button.getAttribute("role") !== "tab",
        });
      });
    });

    [obsSetupTab, obsAppearanceTab].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
          return;
        }
        event.preventDefault();
        const showAppearance = event.key === "ArrowRight" || event.key === "End";
        setOBSSection(showAppearance ? "appearance" : "setup", { focusTab: true });
      });
    });

    overlayDialog.querySelectorAll("[data-copy-obs-url]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const input = document.getElementById(button.dataset.copyObsUrl);
        if (!input) {
          return;
        }
        const copied = await copyOBSURL(input);
        const label = button.dataset.copyLabel || "URL";
        showOBSCopyFeedback(
          button,
          copied
            ? label + " copied. Paste it into OBS."
            : "Could not copy automatically. Select the URL and copy it manually.",
          copied
        );
      });
    });

    overlayDialog.addEventListener("close", function () {
      resetOBSCopyFeedback();
      if (obsCopyStatus) {
        obsCopyStatus.textContent = "";
        obsCopyStatus.classList.remove("obs-copy-status--error");
      }
    });
  }

  function positionErrorPopover(trigger) {
    if (!statusErrorPopover || statusErrorPopover.hidden) {
      return;
    }

    const viewportGap = 12;
    const triggerGap = 7;
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = statusErrorPopover.getBoundingClientRect();
    let left = triggerRect.right - popoverRect.width;
    let top = triggerRect.bottom + triggerGap;

    left = Math.max(
      viewportGap,
      Math.min(left, window.innerWidth - popoverRect.width - viewportGap)
    );
    if (top + popoverRect.height > window.innerHeight - viewportGap) {
      top = Math.max(viewportGap, triggerRect.top - popoverRect.height - triggerGap);
    }

    statusErrorPopover.style.left = Math.round(left) + "px";
    statusErrorPopover.style.top = Math.round(top) + "px";
  }

  function hideErrorPopover() {
    if (activeErrorTrigger) {
      activeErrorTrigger.setAttribute("aria-expanded", "false");
    }
    activeErrorTrigger = null;
    errorPopoverPinned = false;
    if (!statusErrorPopover) {
      return;
    }
    statusErrorPopover.hidden = true;
    statusErrorPopover.textContent = "";
    statusErrorPopover.style.left = "";
    statusErrorPopover.style.top = "";
  }

  function showErrorPopover(trigger, pin) {
    if (!statusErrorPopover || !trigger) {
      return;
    }
    if (activeErrorTrigger === trigger && errorPopoverPinned && !pin) {
      return;
    }
    if (activeErrorTrigger && activeErrorTrigger !== trigger) {
      activeErrorTrigger.setAttribute("aria-expanded", "false");
    }

    activeErrorTrigger = trigger;
    errorPopoverPinned = Boolean(pin);
    trigger.setAttribute("aria-expanded", "true");
    statusErrorPopover.textContent = trigger.dataset.errorText || "";
    statusErrorPopover.hidden = false;
    positionErrorPopover(trigger);
  }

  function createErrorDetailTrigger(errorText, contextLabel) {
    const trigger = document.createElement("button");
    trigger.className = "error-detail-trigger";
    trigger.type = "button";
    trigger.textContent = "Error";
    trigger.dataset.errorText = "Last error: " + errorText;
    trigger.setAttribute("aria-label", contextLabel + " technical error details");
    trigger.setAttribute("aria-controls", "status-error-popover");
    trigger.setAttribute("aria-describedby", "status-error-popover");
    trigger.setAttribute("aria-expanded", "false");

    trigger.addEventListener("mouseenter", function () {
      showErrorPopover(trigger, false);
    });
    trigger.addEventListener("mouseleave", function () {
      if (!errorPopoverPinned && document.activeElement !== trigger) {
        hideErrorPopover();
      }
    });
    trigger.addEventListener("focus", function () {
      showErrorPopover(trigger, false);
    });
    trigger.addEventListener("blur", function () {
      hideErrorPopover();
    });
    trigger.addEventListener("click", function () {
      if (activeErrorTrigger === trigger && errorPopoverPinned) {
        hideErrorPopover();
        return;
      }
      showErrorPopover(trigger, true);
    });

    return trigger;
  }

  document.addEventListener("pointerdown", function (event) {
    if (
      errorPopoverPinned &&
      activeErrorTrigger &&
      event.target !== activeErrorTrigger
    ) {
      hideErrorPopover();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && activeErrorTrigger) {
      hideErrorPopover();
    }
  });
  window.addEventListener("resize", hideErrorPopover);
  window.addEventListener("scroll", hideErrorPopover, true);

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
    if (dialog === overlayDialog) {
      setOBSSection("appearance");
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

  function updateYouTubeConnectionModeUI() {
    const isPageMode =
      youtubeConnectionMode && youtubeConnectionMode.value === "page";
    if (youtubePageFields) {
      youtubePageFields.hidden = !isPageMode;
    }
    if (youtubeApiFields) {
      youtubeApiFields.hidden = isPageMode;
    }
    if (youtubeConnect) {
      youtubeConnect.hidden = isPageMode;
    }
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
    overlayTheme.value = normalizeOverlayTheme(overlay.theme);
    applyRichChatFromConfig(overlay);

    if (config.youtube) {
      youtubeEnabled.checked = Boolean(config.youtube.enabled);
      if (youtubeConnectionMode) {
        const connectionMode = config.youtube.connection_mode || "api";
        youtubeConnectionMode.value =
          connectionMode === "page" ? "page" : "api";
      }
      if (youtubeChannelHandle) {
        youtubeChannelHandle.value = config.youtube.channel_handle || "";
      }
      if (youtubeVideoInput) {
        youtubeVideoInput.value = config.youtube.video_input || "";
      }
      if (youtubeChatMode) {
        const mode = config.youtube.chat_mode || "stream";
        youtubeChatMode.value =
          mode === "poll" || mode === "auto" ? mode : "stream";
      }
      const oauth = config.youtube.oauth || {};
      youtubeClientId.value = oauth.client_id || "";
      youtubeClientSecret.value = "";
      updateYouTubeConnectionModeUI();
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
    scheduleOverlayPreviewRefresh();
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

  function overlayDisplaySettingsChanged(payload) {
    if (!currentConfig) {
      return true;
    }
    const next = payload.overlay;
    const prev = currentConfig.overlay || {};
    return (
      next.max_messages !==
        (typeof prev.max_messages === "number" ? prev.max_messages : 30) ||
      next.message_ttl_seconds !==
        (typeof prev.message_ttl_seconds === "number" ? prev.message_ttl_seconds : 20) ||
      next.font_size_px !==
        (typeof prev.font_size_px === "number" ? prev.font_size_px : 18) ||
      next.display_mode !== (prev.display_mode === "compact" ? "compact" : "normal") ||
      next.theme !== normalizeOverlayTheme(prev.theme)
    );
  }

  function normalizeOverlayTheme(raw) {
    return typeof raw === "string" && OVERLAY_THEMES.indexOf(raw) !== -1
      ? raw
      : "default";
  }

  function readOverlayPreviewPreference(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeOverlayPreviewPreference(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      /* localStorage can be unavailable in locked-down browser contexts. */
    }
  }

  function clampOverlayPreviewDimension(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function overlayPreviewDimensions() {
    return {
      width: clampOverlayPreviewDimension(
        overlayPreviewWidth && overlayPreviewWidth.value,
        OVERLAY_PREVIEW_WIDTH_MIN,
        OVERLAY_PREVIEW_WIDTH_MAX,
        OVERLAY_PREVIEW_DEFAULT_WIDTH
      ),
      height: clampOverlayPreviewDimension(
        overlayPreviewHeight && overlayPreviewHeight.value,
        OVERLAY_PREVIEW_HEIGHT_MIN,
        OVERLAY_PREVIEW_HEIGHT_MAX,
        OVERLAY_PREVIEW_DEFAULT_HEIGHT
      ),
    };
  }

  function overlayPreviewSizePreset(width, height) {
    const presets = Object.keys(OVERLAY_PREVIEW_SIZES);
    for (let i = 0; i < presets.length; i += 1) {
      const size = OVERLAY_PREVIEW_SIZES[presets[i]];
      if (size[0] === width && size[1] === height) {
        return presets[i];
      }
    }
    return "custom";
  }

  function updateOverlayPreviewScale() {
    if (!overlayPreviewStage || !overlayPreviewViewport) {
      return;
    }
    const dimensions = overlayPreviewDimensions();
    const availableWidth = Math.max(0, overlayPreviewStage.clientWidth - 20);
    const availableHeight = Math.max(0, overlayPreviewStage.clientHeight - 20);
    if (availableWidth === 0 || availableHeight === 0) {
      return;
    }
    const scale = Math.min(
      1,
      availableWidth / dimensions.width,
      availableHeight / dimensions.height
    );
    overlayPreviewViewport.style.transform =
      "translate(-50%, -50%) scale(" + String(scale) + ")";
  }

  function applyOverlayPreviewDimensions(options) {
    if (!overlayPreviewViewport || !overlayPreviewWidth || !overlayPreviewHeight) {
      return;
    }
    const dimensions = overlayPreviewDimensions();
    const shouldNormalize = !options || options.normalize !== false;
    const shouldPersist = !options || options.persist !== false;
    if (shouldNormalize) {
      overlayPreviewWidth.value = String(dimensions.width);
      overlayPreviewHeight.value = String(dimensions.height);
    }
    overlayPreviewViewport.style.width = String(dimensions.width) + "px";
    overlayPreviewViewport.style.height = String(dimensions.height) + "px";
    if (overlayPreviewSize) {
      overlayPreviewSize.value = overlayPreviewSizePreset(
        dimensions.width,
        dimensions.height
      );
    }
    if (shouldPersist) {
      writeOverlayPreviewPreference(OVERLAY_PREVIEW_WIDTH_KEY, dimensions.width);
      writeOverlayPreviewPreference(OVERLAY_PREVIEW_HEIGHT_KEY, dimensions.height);
    }
    updateOverlayPreviewScale();
  }

  function applyOverlayPreviewBackground() {
    if (!overlayPreviewBackground) {
      return;
    }
    const backgrounds = ["busy", "checker", "dark"];
    const background = backgrounds.indexOf(overlayPreviewBackground.value) !== -1
      ? overlayPreviewBackground.value
      : "busy";
    overlayPreviewBackground.value = background;
  }

  function overlayPreviewNumber(input, min, max, fallback) {
    const value = Number.parseInt(input && input.value, 10);
    if (!Number.isFinite(value) || value < min || value > max) {
      return fallback;
    }
    return value;
  }

  function buildOverlayPreviewURL(previewMode) {
    const persistedOverlay = currentConfig && currentConfig.overlay
      ? currentConfig.overlay
      : {};
    const url = new URL("/overlay", window.location.origin);
    if (previewMode) {
      url.searchParams.set("preview", previewMode);
      url.searchParams.set(
        "preview_background",
        overlayPreviewBackground && ["busy", "checker", "dark"].indexOf(
          overlayPreviewBackground.value
        ) !== -1
          ? overlayPreviewBackground.value
          : "busy"
      );
    }
    url.searchParams.set(
      "max_messages",
      String(
        overlayPreviewNumber(
          overlayMaxMessages,
          1,
          Number.MAX_SAFE_INTEGER,
          typeof persistedOverlay.max_messages === "number"
            ? persistedOverlay.max_messages
            : 30
        )
      )
    );
    url.searchParams.set(
      "message_ttl_seconds",
      String(
        overlayPreviewNumber(
          overlayMessageTTL,
          0,
          Number.MAX_SAFE_INTEGER,
          typeof persistedOverlay.message_ttl_seconds === "number"
            ? persistedOverlay.message_ttl_seconds
            : 20
        )
      )
    );
    url.searchParams.set(
      "font_size_px",
      String(
        overlayPreviewNumber(
          overlayFontSize,
          OVERLAY_FONT_SIZE_MIN,
          OVERLAY_FONT_SIZE_MAX,
          typeof persistedOverlay.font_size_px === "number"
            ? persistedOverlay.font_size_px
            : 18
        )
      )
    );
    url.searchParams.set(
      "display_mode",
      overlayDisplayMode && overlayDisplayMode.value === "compact"
        ? "compact"
        : "normal"
    );
    url.searchParams.set(
      "theme",
      normalizeOverlayTheme(overlayTheme && overlayTheme.value)
    );
    return url;
  }

  function updateOverlayPreviewOpenLink() {
    if (overlayPreviewOpen) {
      overlayPreviewOpen.href = buildOverlayPreviewURL("").toString();
    }
  }

  function updateOverlayPreviewNote() {
    if (!overlayPreviewNote || !overlayPreviewMode) {
      return;
    }
    overlayPreviewNote.textContent = overlayPreviewMode.value === "live"
      ? "Live chat restores recent messages and follows new messages through WebSocket."
      : "Sample messages stay visible so you can compare themes. TTL is applied in Live chat and OBS.";
  }

  function refreshOverlayPreview(force) {
    if (overlayPreviewRefreshTimer !== null) {
      window.clearTimeout(overlayPreviewRefreshTimer);
      overlayPreviewRefreshTimer = null;
    }
    updateOverlayPreviewOpenLink();
    if (!overlayDialog || !overlayDialog.open || !overlayPreviewFrame) {
      return;
    }
    const mode = overlayPreviewMode && overlayPreviewMode.value === "live"
      ? "live"
      : "sample";
    const url = buildOverlayPreviewURL(mode);
    const baseURL = url.toString();
    if (!force && overlayPreviewFrame.dataset.previewUrl === baseURL) {
      return;
    }
    overlayPreviewRevision += 1;
    url.searchParams.set("_preview_revision", String(overlayPreviewRevision));
    overlayPreviewFrame.dataset.previewUrl = baseURL;
    overlayPreviewFrame.src = url.toString();
  }

  function scheduleOverlayPreviewRefresh() {
    updateOverlayPreviewOpenLink();
    if (!overlayDialog || !overlayDialog.open) {
      return;
    }
    if (overlayPreviewRefreshTimer !== null) {
      window.clearTimeout(overlayPreviewRefreshTimer);
    }
    overlayPreviewRefreshTimer = window.setTimeout(function () {
      overlayPreviewRefreshTimer = null;
      refreshOverlayPreview(false);
    }, OVERLAY_PREVIEW_REFRESH_MS);
  }

  function mountOverlayPreview() {
    if (!overlayPreviewFrame) {
      return;
    }
    applyOverlayPreviewDimensions({ normalize: true });
    applyOverlayPreviewBackground();
    updateOverlayPreviewNote();
    window.requestAnimationFrame(updateOverlayPreviewScale);
    refreshOverlayPreview(true);
  }

  function unmountOverlayPreview() {
    if (overlayPreviewRefreshTimer !== null) {
      window.clearTimeout(overlayPreviewRefreshTimer);
      overlayPreviewRefreshTimer = null;
    }
    if (!overlayPreviewFrame) {
      return;
    }
    overlayPreviewFrame.dataset.previewUrl = "";
    overlayPreviewFrame.src = "about:blank";
  }

  function initOverlayPreview() {
    if (
      !overlayDialog ||
      !overlayPreviewFrame ||
      !overlayPreviewMode ||
      !overlayPreviewBackground ||
      !overlayPreviewWidth ||
      !overlayPreviewHeight
    ) {
      return;
    }

    const storedMode = readOverlayPreviewPreference(
      OVERLAY_PREVIEW_MODE_KEY,
      "sample"
    );
    overlayPreviewMode.value = storedMode === "live" ? "live" : "sample";

    const storedBackground = readOverlayPreviewPreference(
      OVERLAY_PREVIEW_BACKGROUND_KEY,
      "busy"
    );
    overlayPreviewBackground.value = ["busy", "checker", "dark"].indexOf(
      storedBackground
    ) !== -1
      ? storedBackground
      : "busy";

    overlayPreviewWidth.value = String(
      clampOverlayPreviewDimension(
        readOverlayPreviewPreference(
          OVERLAY_PREVIEW_WIDTH_KEY,
          OVERLAY_PREVIEW_DEFAULT_WIDTH
        ),
        OVERLAY_PREVIEW_WIDTH_MIN,
        OVERLAY_PREVIEW_WIDTH_MAX,
        OVERLAY_PREVIEW_DEFAULT_WIDTH
      )
    );
    overlayPreviewHeight.value = String(
      clampOverlayPreviewDimension(
        readOverlayPreviewPreference(
          OVERLAY_PREVIEW_HEIGHT_KEY,
          OVERLAY_PREVIEW_DEFAULT_HEIGHT
        ),
        OVERLAY_PREVIEW_HEIGHT_MIN,
        OVERLAY_PREVIEW_HEIGHT_MAX,
        OVERLAY_PREVIEW_DEFAULT_HEIGHT
      )
    );

    applyOverlayPreviewDimensions({ normalize: true, persist: false });
    applyOverlayPreviewBackground();
    updateOverlayPreviewNote();
    updateOverlayPreviewOpenLink();

    overlayPreviewMode.addEventListener("change", function () {
      writeOverlayPreviewPreference(
        OVERLAY_PREVIEW_MODE_KEY,
        overlayPreviewMode.value
      );
      updateOverlayPreviewNote();
      refreshOverlayPreview(true);
    });

    overlayPreviewBackground.addEventListener("change", function () {
      applyOverlayPreviewBackground();
      writeOverlayPreviewPreference(
        OVERLAY_PREVIEW_BACKGROUND_KEY,
        overlayPreviewBackground.value
      );
      refreshOverlayPreview(true);
    });

    if (overlayPreviewSize) {
      overlayPreviewSize.addEventListener("change", function () {
        const size = OVERLAY_PREVIEW_SIZES[overlayPreviewSize.value];
        if (!size) {
          return;
        }
        overlayPreviewWidth.value = String(size[0]);
        overlayPreviewHeight.value = String(size[1]);
        applyOverlayPreviewDimensions({ normalize: true });
      });
    }

    [overlayPreviewWidth, overlayPreviewHeight].forEach(function (input) {
      input.addEventListener("input", function () {
        if (overlayPreviewWidth.checkValidity() && overlayPreviewHeight.checkValidity()) {
          applyOverlayPreviewDimensions({ normalize: false });
        }
      });
      input.addEventListener("change", function () {
        applyOverlayPreviewDimensions({ normalize: true });
      });
    });

    [
      overlayMaxMessages,
      overlayMessageTTL,
      overlayFontSize,
      overlayDisplayMode,
      overlayTheme,
    ].forEach(function (input) {
      input.addEventListener("input", scheduleOverlayPreviewRefresh);
      input.addEventListener("change", scheduleOverlayPreviewRefresh);
    });

    if (overlayPreviewReplay) {
      overlayPreviewReplay.addEventListener("click", function () {
        refreshOverlayPreview(true);
      });
    }

    overlayDialog.addEventListener("close", unmountOverlayPreview);
    if (typeof ResizeObserver === "function" && overlayPreviewStage) {
      overlayPreviewResizeObserver = new ResizeObserver(updateOverlayPreviewScale);
      overlayPreviewResizeObserver.observe(overlayPreviewStage);
    } else {
      window.addEventListener("resize", updateOverlayPreviewScale);
    }
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
        connection_mode: youtubeConnectionMode
          ? youtubeConnectionMode.value
          : "api",
        video_input: youtubeVideoInput ? youtubeVideoInput.value.trim() : "",
        channel_handle: youtubeChannelHandle ? youtubeChannelHandle.value.trim() : "",
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
      payload.overlay.font_size_px < OVERLAY_FONT_SIZE_MIN ||
      payload.overlay.font_size_px > OVERLAY_FONT_SIZE_MAX
    ) {
      setFieldError(
        "overlay_font_size_px",
        "Font size must be between " + OVERLAY_FONT_SIZE_MIN + " and " + OVERLAY_FONT_SIZE_MAX + " px."
      );
      firstInvalid = firstInvalid || overlayFontSize;
    }

    if (
      payload.overlay.display_mode !== "normal" &&
      payload.overlay.display_mode !== "compact"
    ) {
      setFieldError("overlay_display_mode", "Choose comfortable or compact spacing.");
      firstInvalid = firstInvalid || overlayDisplayMode;
    }

    if (
      OVERLAY_THEMES.indexOf(payload.overlay.theme) === -1
    ) {
      setFieldError("overlay_theme", "Choose a supported overlay theme.");
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

  function platformSummaryText(platform) {
    const parts = [];
    if (typeof platform.detail === "string" && platform.detail !== "") {
      parts.push(platform.detail);
    }
    const countSuffix = formatMessageCount(platform.message_count);
    if (countSuffix !== "") {
      parts.push("Received" + countSuffix);
    }
    return parts.join(" ");
  }

  function renderPlatformDetail(el, platform, platformLabel) {
    const summary = platformSummaryText(platform);
    const lastError =
      typeof platform.last_error === "string" ? platform.last_error.trim() : "";
    if (!el) {
      return;
    }
    const renderKey = summary + "\0" + lastError;
    if (el.dataset.renderKey === renderKey) {
      return;
    }
    if (activeErrorTrigger && el.contains(activeErrorTrigger)) {
      hideErrorPopover();
    }

    el.dataset.renderKey = renderKey;
    el.replaceChildren();
    if (summary !== "") {
      const summaryText = document.createElement("span");
      summaryText.className = "status-detail__summary";
      summaryText.textContent = summary;
      el.appendChild(summaryText);
    }
    if (lastError !== "") {
      el.appendChild(createErrorDetailTrigger(lastError, platformLabel));
    }
    el.hidden = summary === "" && lastError === "";
  }

  function renderStatus(status) {
    const twitch = status.twitch || {};
    renderPlatformStatus(twitchStatus, twitch);
    renderPlatformDetail(twitchDetail, twitch, "Twitch");

    const youtube = status.youtube || {};
    renderPlatformStatus(youtubeStatus, youtube);

    if (youtube.connection_mode === "page") {
      if (youtube.channel) {
        youtubeOAuthLabel.textContent = "Simple · @" + youtube.channel;
      } else if (youtube.video_id) {
        youtubeOAuthLabel.textContent = "Simple · " + youtube.video_id;
      } else {
        youtubeOAuthLabel.textContent = "Simple (channel or video URL)";
      }
      if (youtubeConnect) {
        youtubeConnect.hidden = true;
      }
    } else {
      if (youtube.oauth_connected) {
        youtubeOAuthLabel.textContent = "API · Connected";
      } else {
        youtubeOAuthLabel.textContent = "API · Not connected";
      }
      if (youtubeConnect) {
        youtubeConnect.hidden = false;
      }
    }

    renderPlatformDetail(youtubeDetail, youtube, "YouTube");

    const vk = status.vk || {};
    renderPlatformStatus(vkStatus, vk);
    renderPlatformDetail(vkDetail, vk, "VK Live");
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
        if (activeErrorTrigger && emoteProviderList.contains(activeErrorTrigger)) {
          hideErrorPopover();
        }
        emoteProviderList.dataset.renderKey = "";
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

    const renderKey = JSON.stringify(emoteCache);
    if (emoteProviderList.dataset.renderKey === renderKey) {
      return;
    }
    if (activeErrorTrigger && emoteProviderList.contains(activeErrorTrigger)) {
      hideErrorPopover();
    }
    emoteProviderList.dataset.renderKey = renderKey;
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
        item.appendChild(
          createErrorDetailTrigger(snap.last_error, (PROVIDER_LABELS[key] || key) + " emotes")
        );
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

  function messageIdentity(msg) {
    const platform = typeof msg.platform === "string" ? msg.platform.trim().toLowerCase() : "";
    const username = typeof msg.username === "string" ? msg.username.trim().toLowerCase() : "";
    const displayName = messageDisplayName(msg).trim().toLowerCase();
    return [platform, username || displayName || "?"].join(":");
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function userAccent(msg) {
    const palette = [
      "#57d68d",
      "#5ec8ff",
      "#ffca55",
      "#ff8f70",
      "#c89cff",
      "#66e3d4",
      "#f06ea9",
      "#a5d65e",
      "#8ca8ff",
      "#f0a84f",
    ];
    const hash = hashString(messageIdentity(msg));
    return palette[hash % palette.length];
  }

  function safeAvatarURL(value) {
    if (typeof value !== "string" || value.trim() === "") {
      return "";
    }
    try {
      const url = new URL(value, window.location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }
      return url.href;
    } catch {
      return "";
    }
  }

  function initialsForName(name) {
    return name
      .split(/[\s._-]+/)
      .filter(function (part) {
        return part !== "";
      })
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("") || "?";
  }

  function escapeSVGText(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function avatarFallbackURL(msg) {
    const identity = messageIdentity(msg);
    const hash = hashString(identity);
    const accent = userAccent(msg);
    const initials = escapeSVGText(initialsForName(messageDisplayName(msg)));
    const bgPalette = ["#1e2d24", "#1c2b36", "#33281a", "#332022", "#2b2340"];
    const variant = hash % 5;
    const bg = bgPalette[hash % bgPalette.length];
    const shapes = [
      '<circle cx="18" cy="20" r="10" fill="' + accent + '" opacity="0.95"/>',
      '<rect x="9" y="9" width="30" height="30" rx="12" fill="' + accent + '" opacity="0.95"/>',
      '<path d="M24 6 43 18 36 41H12L5 18Z" fill="' + accent + '" opacity="0.95"/>',
      '<circle cx="17" cy="18" r="9" fill="' + accent + '" opacity="0.9"/><circle cx="31" cy="29" r="12" fill="' + accent + '" opacity="0.72"/>',
      '<path d="M8 32c6-18 26-22 32-6 2 6-2 12-8 14H16c-6-1-10-3-8-8Z" fill="' + accent + '" opacity="0.95"/>',
    ];
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="12" fill="' + bg + '"/>' +
      '<circle cx="40" cy="8" r="12" fill="#ffffff" opacity="0.08"/>' +
      shapes[variant] +
      '<text x="24" y="31" text-anchor="middle" font-family="Consolas,monospace" font-size="14" font-weight="700" fill="#fff">' +
      initials +
      "</text></svg>";
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function buildAvatarImage(msg) {
    const avatar = document.createElement("img");
    avatar.className = "message-list__avatar";
    avatar.alt = "";
    avatar.decoding = "async";
    avatar.draggable = false;
    avatar.referrerPolicy = "no-referrer";

    const fallback = avatarFallbackURL(msg);
    const url = safeAvatarURL(msg.avatar_url);
    avatar.src = url !== "" ? url : fallback;
    if (url !== "") {
      avatar.addEventListener("error", function () {
        avatar.src = fallback;
      }, { once: true });
    }
    return avatar;
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
      avatar_url: typeof wire.avatar_url === "string" ? wire.avatar_url : "",
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

  function messagesPanel() {
    return recentMessages ? recentMessages.closest(".message-panel") : null;
  }

  function messagesFingerprint(messages) {
    if (!messages || messages.length === 0) {
      return "";
    }
    return messages
      .map(function (msg) {
        return messageKey(msg);
      })
      .join("\0");
  }

  function renderedMessagesFingerprintFromDOM() {
    if (!recentMessages) {
      return "";
    }
    return Array.from(recentMessages.children)
      .map(function (el) {
        return el.dataset.messageKey || "";
      })
      .join("\0");
  }

  function isMessagesPanelNearBottom(panel) {
    if (!panel) {
      return true;
    }
    const distance = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    return distance <= MESSAGE_SCROLL_THRESHOLD_PX;
  }

  function buildMessageListItem(msg) {
    const item = document.createElement("li");
    item.className = "message-list__item";
    item.dataset.messageKey = messageKey(msg);
    item.style.setProperty("--message-accent", userAccent(msg));

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

    const content = document.createElement("div");
    content.className = "message-list__content";
    content.appendChild(meta);
    content.appendChild(text);

    item.appendChild(buildAvatarImage(msg));
    item.appendChild(content);
    return item;
  }

  function scrollMessagesToBottom() {
    const panel = messagesPanel();
    if (!panel) {
      return;
    }
    window.requestAnimationFrame(function () {
      panel.scrollTop = panel.scrollHeight;
    });
  }

  function restoreMessagesScroll(panel, prevScrollTop, prevScrollHeight) {
    if (!panel) {
      return;
    }
    window.requestAnimationFrame(function () {
      if (isMessagesPanelNearBottom(panel)) {
        panel.scrollTop = panel.scrollHeight;
        return;
      }
      const delta = panel.scrollHeight - prevScrollHeight;
      panel.scrollTop = Math.max(0, prevScrollTop + delta);
    });
  }

  function appendRecentMessage(msg) {
    const stickToBottom = isMessagesPanelNearBottom(messagesPanel());

    recentMessagesEmpty.hidden = true;
    recentMessages.appendChild(buildMessageListItem(msg));
    while (recentMessages.children.length > RECENT_MESSAGE_LIMIT) {
      recentMessages.removeChild(recentMessages.firstChild);
    }
    renderedMessagesFingerprint = renderedMessagesFingerprintFromDOM();

    if (stickToBottom) {
      scrollMessagesToBottom();
    }
  }

  function renderRecentMessages(messages) {
    const fingerprint = messagesFingerprint(messages);
    if (fingerprint === renderedMessagesFingerprint && recentMessages.children.length > 0) {
      return;
    }

    const panel = messagesPanel();
    const stickToBottom = isMessagesPanelNearBottom(panel);
    const prevScrollTop = panel ? panel.scrollTop : 0;
    const prevScrollHeight = panel ? panel.scrollHeight : 0;

    recentMessages.textContent = "";

    if (!messages || messages.length === 0) {
      recentMessagesEmpty.hidden = false;
      renderedMessagesFingerprint = "";
      return;
    }

    recentMessagesEmpty.hidden = true;

    messages.forEach(function (msg) {
      recentMessages.appendChild(buildMessageListItem(msg));
    });
    renderedMessagesFingerprint = fingerprint;

    if (stickToBottom) {
      scrollMessagesToBottom();
    } else {
      restoreMessagesScroll(panel, prevScrollTop, prevScrollHeight);
    }
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

      const overlayDisplayChanged = overlayDisplaySettingsChanged(payload);
      applyConfig(body);
      if (vkChannel) {
        vkChannel.value = readVkSettings().channel;
      }
      const savedMessage = overlayDisplayChanged
        ? "Settings saved. Refresh the Browser Source in OBS to apply display changes."
        : "Settings saved.";
      showBanner("success", savedMessage);
      closeOpenDialogs();
      await loadStatus();
    } catch {
      showBanner("error", "Cannot reach CommRelay — is it running?");
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
          if (dialog === overlayDialog) {
            updateOBSSetupURLs();
            setOBSSection("setup");
          }
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

  if (youtubeConnectionMode) {
    youtubeConnectionMode.addEventListener("change", function () {
      updateYouTubeConnectionModeUI();
      markSettingsDirty();
    });
  }

  if (vkChannel) {
    vkChannel.addEventListener("blur", function () {
      const normalized = normalizeVkChannel(vkChannel.value);
      if (normalized !== vkChannel.value.trim().toLowerCase()) {
        vkChannel.value = normalized;
      }
    });
  }

  form.addEventListener("submit", saveSettings);
  form.addEventListener("input", function (event) {
    if (!(event.target instanceof Element) || !event.target.closest("[data-preview-only]")) {
      markSettingsDirty();
    }
  });
  form.addEventListener("change", function (event) {
    if (!(event.target instanceof Element) || !event.target.closest("[data-preview-only]")) {
      markSettingsDirty();
    }
  });
  refreshMessages.addEventListener("click", function () {
    loadRecentMessages().catch(function () {
      showBanner("error", "Cannot load recent messages.");
    });
  });

  handleOAuthQuery();
  initSidebarToggle();
  initOverlayPreview();
  initOBSSetup();
  initSettingsDialogs();
  initMessageSoundControls();

  renderSettingsState();

  refreshAll().catch(function () {
    if (!currentConfig) {
      markSettingsUnavailable();
    }
    showBanner("error", "Cannot reach CommRelay — is it running?");
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
    if (overlayPreviewResizeObserver) {
      overlayPreviewResizeObserver.disconnect();
    }
    window.removeEventListener("resize", updateOverlayPreviewScale);
    window.clearInterval(statusTimer);
    window.clearInterval(messagesTimer);
  });
})();
