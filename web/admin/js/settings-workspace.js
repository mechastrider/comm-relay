import * as dom from "./dom.js";
import { state } from "./state.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { t } from "./i18n-ui.js";
import {
  SETTINGS_EDITABLE_SECTIONS,
  SETTINGS_SECTIONS,
  DEFAULT_SETTINGS_SECTION,
  parseSettingsSectionFromHash,
  settingsSectionHash,
  extractSectionValuesFromConfig,
  settingsSectionDirty,
  applySectionToConfig,
} from "./settings-helpers.js";
import { parseWorkspaceHash } from "./workspace-router.js";
import { partitionSettingsSectionsForConfigApply } from "./config-apply-restore.js";
import {
  applyConfig,
  composeConfigUpdateFromServer,
  fetchPublicConfig,
  readVkSettings,
  getRichChatSettings,
  updateYouTubeConnectionModeUI,
  validateSocks5Address,
  proxyRequired,
  loadStatus,
} from "./settings.js";
import { getMessageSoundSettings } from "./sound.js";
import {
  applyServerFieldErrors,
  clearFieldErrors,
  hideBanner,
  renderSettingsState,
  setFieldError,
  showBanner,
} from "./ui-shell.js";
import { renderAboutVersion } from "./about.js";
import { MESSAGE_SOUND_TYPES } from "./constants.js";
import { focusConnectionsField, setConnectionsSection } from "./connections.js";

/** @type {Map<string, Record<string, unknown>>} */
const sectionBaselines = new Map();

/** @type {Map<string, Record<string, unknown>>} */
const sectionDrafts = new Map();

/** @type {Set<string>} */
const sectionSaveInFlight = new Set();

let settingsMounted = false;
let activeSection = DEFAULT_SETTINGS_SECTION;
let navigationGuardBound = false;
let suppressNavigationGuard = false;

const PLATFORM_TABS = ["twitch", "youtube", "vk"];

/**
 * @returns {boolean}
 */
export function isSettingsWorkspaceActive() {
  return parseWorkspaceHash(window.location.hash) === "settings";
}

/**
 * @returns {boolean}
 */
export function anySettingsSectionDirty() {
  return SETTINGS_EDITABLE_SECTIONS.some(function (sectionId) {
    return isSectionDirty(sectionId);
  });
}

/**
 * @param {string} sectionId
 * @returns {boolean}
 */
function isSectionDirty(sectionId) {
  const baseline = sectionBaselines.get(sectionId);
  if (!baseline) {
    return false;
  }
  return settingsSectionDirty(baseline, collectSectionValuesFromDOM(sectionId), sectionId);
}

/**
 * @param {string} sectionId
 * @returns {Record<string, unknown>}
 */
function collectSectionValuesFromDOM(sectionId) {
  if (sectionId === "platforms") {
    return {
      twitch: {
        enabled: dom.twitchEnabled.checked,
        channel: dom.twitchChannel.value.trim().toLowerCase(),
      },
      youtube: {
        enabled: dom.youtubeEnabled.checked,
        connection_mode: dom.youtubeConnectionMode ? dom.youtubeConnectionMode.value : "page",
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
    };
  }

  if (sectionId === "network") {
    return {
      server_port: dom.serverPortInput
        ? Number.parseInt(dom.serverPortInput.value, 10)
        : state.currentConfig
          ? state.currentConfig.server_port
          : 17877,
      network: {
        socks5: {
          address: dom.networkSocks5Address ? dom.networkSocks5Address.value.trim() : "",
          username: dom.networkSocks5Username ? dom.networkSocks5Username.value.trim() : "",
          password: dom.networkSocks5Password ? dom.networkSocks5Password.value : "",
        },
      },
    };
  }

  if (sectionId === "data") {
    return {
      points_per_message: dom.pointsPerMessageInput
        ? Number.parseInt(dom.pointsPerMessageInput.value, 10)
        : 1,
      day_reset_hour: dom.dayResetHourInput
        ? Number.parseInt(dom.dayResetHourInput.value, 10)
        : 6,
    };
  }

  if (sectionId === "application") {
    return {
      admin: {
        time_locale:
          dom.timeLocaleInput && dom.timeLocaleInput.value === "en-GB" ? "en-GB" : "ru-RU",
        message_sound: getMessageSoundSettings(),
      },
      rich_chat: getRichChatSettings(),
    };
  }

  return {};
}

/**
 * @param {string} sectionId
 */
function resetSectionBaseline(sectionId) {
  const config = state.currentConfig || {};
  sectionBaselines.set(sectionId, extractSectionValuesFromConfig(config, sectionId));
  sectionDrafts.delete(sectionId);
  renderSectionChrome(sectionId);
}

export function resetAllSectionBaselines() {
  sectionDrafts.clear();
  SETTINGS_EDITABLE_SECTIONS.forEach(resetSectionBaseline);
  state.settingsLoaded = true;
  state.settingsDirty = false;
  renderSettingsState();
}

function refreshSectionBaselinesAfterConfigApply() {
  const plan = partitionSettingsSectionsForConfigApply(
    SETTINGS_EDITABLE_SECTIONS,
    sectionDrafts.keys()
  );

  plan.restoreSections.forEach(function (sectionId) {
    const savedDraft = sectionDrafts.get(sectionId);
    if (savedDraft) {
      applySectionValuesToDOM(sectionId, savedDraft);
    }
    renderSectionChrome(sectionId);
  });

  plan.resetSections.forEach(resetSectionBaseline);

  state.settingsLoaded = true;
  state.settingsDirty = anySettingsSectionDirty();
  renderSettingsState();
}

/**
 * @param {string} sectionId
 * @param {Record<string, unknown>} values
 */
function applySectionValuesToDOM(sectionId, values) {
  if (sectionId === "platforms") {
    const twitch = /** @type {Record<string, unknown>} */ (values.twitch || {});
    const youtube = /** @type {Record<string, unknown>} */ (values.youtube || {});
    const oauth = /** @type {Record<string, unknown>} */ (
      youtube.oauth && typeof youtube.oauth === "object" ? youtube.oauth : {}
    );
    const vk = /** @type {Record<string, unknown>} */ (values.vk || {});

    dom.twitchEnabled.checked = Boolean(twitch.enabled);
    dom.twitchChannel.value = String(twitch.channel || "");
    dom.youtubeEnabled.checked = Boolean(youtube.enabled);
    if (dom.youtubeConnectionMode) {
      dom.youtubeConnectionMode.value = youtube.connection_mode === "api" ? "api" : "page";
    }
    if (dom.youtubeChannelHandle) {
      dom.youtubeChannelHandle.value = String(youtube.channel_handle || "");
    }
    if (dom.youtubeVideoInput) {
      dom.youtubeVideoInput.value = String(youtube.video_input || "");
    }
    if (dom.youtubeChatMode) {
      const mode = youtube.chat_mode;
      dom.youtubeChatMode.value = mode === "poll" || mode === "auto" ? mode : "stream";
    }
    dom.youtubeClientId.value = String(oauth.client_id || "");
    dom.youtubeClientSecret.value = "";
    if (dom.youtubeUseProxy) {
      dom.youtubeUseProxy.checked = Boolean(youtube.use_proxy);
    }
    if (dom.vkEnabled) {
      dom.vkEnabled.checked = Boolean(vk.enabled);
    }
    if (dom.vkChannel) {
      dom.vkChannel.value = String(vk.channel || "");
    }
    if (dom.vkUseProxy) {
      dom.vkUseProxy.checked = Boolean(vk.use_proxy);
    }
    updateYouTubeConnectionModeUI();
    return;
  }

  if (sectionId === "network") {
    const network = /** @type {Record<string, unknown>} */ (values.network || {});
    const socks5 = /** @type {Record<string, unknown>} */ (network.socks5 || {});
    if (dom.serverPortInput) {
      dom.serverPortInput.value = String(
        typeof values.server_port === "number" ? values.server_port : 17877
      );
    }
    if (dom.networkSocks5Address) {
      dom.networkSocks5Address.value = String(socks5.address || "");
    }
    if (dom.networkSocks5Username) {
      dom.networkSocks5Username.value = String(socks5.username || "");
    }
    if (dom.networkSocks5Password) {
      dom.networkSocks5Password.value = "";
    }
    return;
  }

  if (sectionId === "data") {
    if (dom.pointsPerMessageInput) {
      dom.pointsPerMessageInput.value = String(values.points_per_message);
    }
    if (dom.dayResetHourInput) {
      dom.dayResetHourInput.value = String(values.day_reset_hour);
    }
    return;
  }

  if (sectionId === "application") {
    const admin = /** @type {Record<string, unknown>} */ (values.admin || {});
    const richChat = /** @type {Record<string, unknown>} */ (values.rich_chat || {});
    const emotes = /** @type {Record<string, unknown>} */ (richChat.emotes || {});
    const previews = /** @type {Record<string, unknown>} */ (richChat.image_previews || {});

    if (dom.timeLocaleInput) {
      dom.timeLocaleInput.value = admin.time_locale === "en-GB" ? "en-GB" : "ru-RU";
    }
    const messageSound = /** @type {Record<string, unknown>} */ (admin.message_sound || {});
    if (dom.messageSoundEnabledInput) {
      dom.messageSoundEnabledInput.checked = Boolean(messageSound.enabled);
    }
    if (dom.messageSoundVolumeInput) {
      const volumePercent = Math.round(
        (typeof messageSound.volume === "number" ? messageSound.volume : 0.5) * 100
      );
      dom.messageSoundVolumeInput.value = String(volumePercent);
      if (dom.messageSoundVolumeLabel) {
        dom.messageSoundVolumeLabel.textContent = String(volumePercent) + "%";
      }
    }
    if (dom.messageSoundTypeInput) {
      dom.messageSoundTypeInput.value = String(messageSound.sound || "chime");
    }

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
    dom.imagePreviewsEnabled.checked = Boolean(previews.enabled);
    dom.imagePreviewsAllowedHosts.value = Array.isArray(previews.allowed_hosts)
      ? previews.allowed_hosts.join("\n")
      : "";
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
}

/**
 * @param {string} sectionId
 */
function applySectionBaselineToDOM(sectionId) {
  const baseline = sectionBaselines.get(sectionId);
  if (!baseline) {
    return;
  }
  applySectionValuesToDOM(sectionId, baseline);
}

/**
 * @param {HTMLElement | null} el
 */
function focusSettingsField(el) {
  if (!el) {
    return;
  }
  const section = el.closest("[data-settings-section-panel]");
  if (section instanceof HTMLElement) {
    const sectionId = section.getAttribute("data-settings-section-panel");
    if (sectionId && sectionId !== activeSection) {
      selectSettingsSection(sectionId, { skipDirtyCheck: true });
    }
  }
  focusConnectionsField(el);
}

/**
 * @param {string} sectionId
 * @param {Record<string, unknown>} payload
 * @returns {HTMLElement | null}
 */
function validateSettingsSection(sectionId, payload) {
  let firstInvalid = null;

  if (sectionId === "platforms" || sectionId === "network") {
    if (proxyRequired(payload)) {
      const network = /** @type {Record<string, unknown>} */ (payload.network || {});
      const socks5 = /** @type {Record<string, unknown>} */ (network.socks5 || {});
      if (!validateSocks5Address(socks5.address)) {
        setFieldError(
          "network_socks5_address",
          "Enter a valid host:port address when a platform uses the proxy."
        );
        firstInvalid = dom.networkSocks5Address;
      }
    }
  }

  if (sectionId === "platforms") {
    const twitch = /** @type {Record<string, unknown>} */ (payload.twitch || {});
    if (twitch.enabled && twitch.channel === "") {
      setFieldError("twitch_channel", "Channel is required when Twitch is enabled.");
      firstInvalid = firstInvalid || dom.twitchChannel;
    } else if (
      twitch.channel !== "" &&
      !/^[a-z0-9_]{1,25}$/.test(String(twitch.channel))
    ) {
      setFieldError(
        "twitch_channel",
        "Use a lowercase Twitch login (letters, numbers, underscore)."
      );
      firstInvalid = firstInvalid || dom.twitchChannel;
    }

    const vk = /** @type {Record<string, unknown>} */ (payload.vk || {});
    if (vk.enabled && vk.channel === "") {
      setFieldError("vk_channel", "Channel slug is required when VK Live is enabled.");
      firstInvalid = firstInvalid || dom.vkChannel;
    } else if (
      vk.enabled &&
      vk.channel !== "" &&
      !/^[a-z0-9_-]{1,64}$/.test(String(vk.channel))
    ) {
      setFieldError(
        "vk_channel",
        "Use a lowercase channel slug (letters, numbers, underscore, hyphen)."
      );
      firstInvalid = firstInvalid || dom.vkChannel;
    }
  }

  if (sectionId === "network") {
    const port = payload.server_port;
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      setFieldError("server_port", "Port must be between 1 and 65535.");
      firstInvalid = firstInvalid || dom.serverPortInput;
    }
  }

  if (sectionId === "data") {
    if (!Number.isFinite(payload.points_per_message) || payload.points_per_message < 0) {
      setFieldError("points_per_message", "Points per message must be 0 or greater.");
      firstInvalid = firstInvalid || dom.pointsPerMessageInput;
    }
    if (
      !Number.isFinite(payload.day_reset_hour) ||
      payload.day_reset_hour < 0 ||
      payload.day_reset_hour > 23
    ) {
      setFieldError("day_reset_hour", "Day reset hour must be between 0 and 23.");
      firstInvalid = firstInvalid || dom.dayResetHourInput;
    }
  }

  if (sectionId === "application") {
    const admin = /** @type {Record<string, unknown>} */ (payload.admin || {});
    const sound = /** @type {Record<string, unknown>} */ (admin.message_sound || {});
    if (!sound || sound.volume < 0 || sound.volume > 1) {
      setFieldError("admin_message_sound_volume", "Volume must be between 0% and 100%.");
      firstInvalid = firstInvalid || dom.messageSoundVolumeInput;
    }
    if (!sound || MESSAGE_SOUND_TYPES.indexOf(sound.sound) === -1) {
      setFieldError("admin_message_sound_sound", "Choose a sound type.");
      firstInvalid = firstInvalid || dom.messageSoundTypeInput;
    }

    const overlay = /** @type {Record<string, unknown>} */ (payload.overlay || {});
    const previews = /** @type {Record<string, unknown>} */ (overlay.image_previews || {});
    if (previews.enabled) {
      const hosts = previews.allowed_hosts;
      if (!hosts || !Array.isArray(hosts) || hosts.length === 0) {
        setFieldError(
          "overlay_image_previews_allowed_hosts",
          "Add at least one allowed hostname."
        );
        firstInvalid = firstInvalid || dom.imagePreviewsAllowedHosts;
      } else {
        hosts.forEach(function (host) {
          if (String(host).indexOf("/") !== -1 || String(host).indexOf(":") !== -1) {
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
  }

  if (firstInvalid) {
    focusSettingsField(firstInvalid);
    firstInvalid.focus();
    return firstInvalid;
  }

  return null;
}

/**
 * @param {string} sectionId
 */
function renderSectionChrome(sectionId) {
  const panel = document.querySelector('[data-settings-section-panel="' + sectionId + '"]');
  if (!panel) {
    return;
  }
  const dirty = isSectionDirty(sectionId);
  const saving = sectionSaveInFlight.has(sectionId);

  const dirtyEl = panel.querySelector("[data-section-dirty]");
  if (dirtyEl instanceof HTMLElement) {
    dirtyEl.hidden = !dirty;
    dirtyEl.textContent = dirty ? t("settings.sectionDirty") : "";
  }

  panel.querySelectorAll("[data-section-save]").forEach(function (button) {
    if (button instanceof HTMLButtonElement) {
      button.disabled = saving || !dirty;
      button.setAttribute("aria-busy", saving ? "true" : "false");
    }
  });

  panel.querySelectorAll("[data-section-reset]").forEach(function (button) {
    if (button instanceof HTMLButtonElement) {
      button.disabled = saving || !dirty;
    }
  });
}

function renderAllSectionChrome() {
  SETTINGS_EDITABLE_SECTIONS.forEach(renderSectionChrome);
  state.settingsDirty = anySettingsSectionDirty();
  renderSettingsState();
}

function notifySectionInput(sectionId) {
  if (!sectionBaselines.has(sectionId)) {
    return;
  }
  if (isSectionDirty(sectionId)) {
    sectionDrafts.set(sectionId, collectSectionValuesFromDOM(sectionId));
  } else {
    sectionDrafts.delete(sectionId);
  }
  renderSectionChrome(sectionId);
  state.settingsDirty = anySettingsSectionDirty();
  renderSettingsState();
}

/**
 * @param {string} sectionId
 * @returns {boolean}
 */
function confirmDiscardSection(sectionId) {
  if (!isSectionDirty(sectionId)) {
    return true;
  }
  return window.confirm(t("settings.discardConfirm"));
}

/**
 * @param {string} sectionId
 * @param {{ skipDirtyCheck?: boolean }} [options]
 */
export function selectSettingsSection(sectionId, options) {
  const nextSection = SETTINGS_SECTIONS.includes(sectionId) ? sectionId : DEFAULT_SETTINGS_SECTION;
  if (!options || !options.skipDirtyCheck) {
    if (
      isSettingsWorkspaceActive() &&
      activeSection !== nextSection &&
      SETTINGS_EDITABLE_SECTIONS.includes(activeSection) &&
      isSectionDirty(activeSection) &&
      !confirmDiscardSection(activeSection)
    ) {
      return;
    }
    if (isSectionDirty(activeSection)) {
      applySectionBaselineToDOM(activeSection);
      resetSectionBaseline(activeSection);
    }
  }

  activeSection = nextSection;

  document.querySelectorAll("[data-settings-nav]").forEach(function (link) {
    if (!(link instanceof HTMLElement)) {
      return;
    }
    const navSection = link.getAttribute("data-settings-nav");
    const selected = navSection === nextSection;
    link.classList.toggle("settings-nav__link--active", selected);
    if (link instanceof HTMLAnchorElement) {
      if (selected) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
    if (link.getAttribute("role") === "tab") {
      link.setAttribute("aria-selected", selected ? "true" : "false");
      link.tabIndex = selected ? 0 : -1;
    }
  });

  document.querySelectorAll("[data-settings-section-panel]").forEach(function (panel) {
    if (!(panel instanceof HTMLElement)) {
      return;
    }
    const panelSection = panel.getAttribute("data-settings-section-panel");
    const visible = panelSection === nextSection;
    panel.hidden = !visible;
    panel.classList.toggle("settings-section--active", visible);
  });

  if (nextSection === "about") {
    renderAboutVersion();
  }

  const desiredHash = settingsSectionHash(nextSection);
  if (isSettingsWorkspaceActive() && window.location.hash !== desiredHash) {
    suppressNavigationGuard = true;
    window.history.replaceState(null, "", desiredHash);
  }
}

async function saveSettingsSection(sectionId) {
  if (sectionSaveInFlight.has(sectionId) || !isSectionDirty(sectionId)) {
    return;
  }

  hideBanner();
  clearFieldErrors();

  sectionSaveInFlight.add(sectionId);
  renderSectionChrome(sectionId);

  try {
    const latest = await fetchPublicConfig();
    const sectionValues = collectSectionValuesFromDOM(sectionId);
    const basePayload = composeConfigUpdateFromServer(latest, latest.overlay || {});
    const payload = applySectionToConfig(basePayload, sectionId, sectionValues);

    if (validateSettingsSection(sectionId, payload) !== null) {
      showBanner("error", t("banner.checkFields"));
      return;
    }

    const response = await fetch(apiURL("/api/config/update"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await readJSON(response);
    if (!response.ok) {
      const firstInvalid =
        body && body.fields ? applyServerFieldErrors(body.fields) : null;
      if (firstInvalid) {
        focusSettingsField(firstInvalid);
        firstInvalid.focus();
      }
      showBanner("error", mapHTTPError(response.status, body && body.error));
      return;
    }

    applyConfig(body);
    if (dom.vkChannel) {
      dom.vkChannel.value = readVkSettings().channel;
    }
    resetSectionBaseline(sectionId);
    showBanner("success", t("settings.sectionSaved"));
    await loadStatus();
  } catch {
    showBanner("error", t("banner.cannotReach"));
  } finally {
    sectionSaveInFlight.delete(sectionId);
    renderSectionChrome(sectionId);
    state.settingsDirty = anySettingsSectionDirty();
    renderSettingsState();
  }
}

function createSectionToolbar(sectionId) {
  const toolbar = document.createElement("div");
  toolbar.className = "settings-section__toolbar";
  toolbar.innerHTML =
    '<span class="settings-section__dirty" data-section-dirty hidden role="status" aria-live="polite"></span>' +
    '<div class="settings-section__actions">' +
    '<button class="btn-physical btn-small" type="button" data-section-reset>' +
    t("settings.resetSection") +
    "</button>" +
    '<button class="btn-physical btn-start btn-small" type="button" data-section-save>' +
    t("settings.saveSection") +
    "</button>" +
    "</div>";
  toolbar.querySelector("[data-section-reset]")?.addEventListener("click", function () {
    if (!confirmDiscardSection(sectionId)) {
      return;
    }
    applySectionBaselineToDOM(sectionId);
    resetSectionBaseline(sectionId);
    renderAllSectionChrome();
  });
  toolbar.querySelector("[data-section-save]")?.addEventListener("click", function () {
    saveSettingsSection(sectionId).catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
  });
  return toolbar;
}

function mountEditableSection(sectionId, bodyMount, contentNodes) {
  const section = document.createElement("section");
  section.className = "settings-section";
  section.dataset.settingsSectionPanel = sectionId;
  section.hidden = sectionId !== activeSection;
  section.setAttribute("aria-labelledby", "settings-section-" + sectionId + "-heading");

  const heading = document.createElement("h2");
  heading.id = "settings-section-" + sectionId + "-heading";
  heading.className = "settings-section__heading";
  heading.textContent = t("settings.section." + sectionId);

  const form = document.createElement("div");
  form.className = "settings-section__form";
  form.dataset.settingsEditable = sectionId;

  section.appendChild(heading);
  section.appendChild(createSectionToolbar(sectionId));
  form.appendChild(contentNodes);
  section.appendChild(form);
  bodyMount.appendChild(section);
}

function mountPlatformsSection(mount) {
  const tabBody = document.createElement("div");
  tabBody.className = "settings-section__body dialog-tab-body";

  const tabList = document.createElement("div");
  tabList.className = "dialog-tabs settings-platform-tabs";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", t("dialog.connectionSections"));

  const panelsWrap = document.createElement("div");
  panelsWrap.className = "settings-platform-panels";

  PLATFORM_TABS.forEach(function (platform, index) {
    const tab = document.getElementById("connections-" + platform + "-tab");
    const panel = document.getElementById("connections-" + platform + "-panel");
    if (!tab || !panel) {
      return;
    }
    tab.classList.add("settings-platform-tab");
    tabList.appendChild(tab);
    panelsWrap.appendChild(panel);
    panel.hidden = index !== 0;
    tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
    tab.tabIndex = index === 0 ? 0 : -1;
  });

  tabBody.appendChild(tabList);
  tabBody.appendChild(panelsWrap);
  mountEditableSection("platforms", mount, tabBody);
  setConnectionsSection("twitch");
}

function mountNetworkSection(mount) {
  const panel = document.getElementById("connections-network-panel");
  if (!panel) {
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "settings-section__body";
  wrapper.appendChild(panel);
  panel.hidden = false;
  mountEditableSection("network", mount, wrapper);
}

function mountDataSection(mount) {
  const viewerStats = document.getElementById("viewer-stats-panel");
  if (!viewerStats) {
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "settings-section__body";
  wrapper.appendChild(viewerStats);
  mountEditableSection("data", mount, wrapper);
}

function mountApplicationSection(mount) {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-section__body settings-application-body";

  const languagePanel = document.getElementById("interface-language-panel");
  const soundPanel = document.getElementById("message-sound-panel");
  const richChatMount = document.getElementById("rich-chat-settings-mount");

  if (languagePanel) {
    wrapper.appendChild(languagePanel);
  }
  if (soundPanel) {
    wrapper.appendChild(soundPanel);
  }
  if (richChatMount) {
    wrapper.appendChild(richChatMount);
  }

  mountEditableSection("application", mount, wrapper);
}

function mountDiagnosticsSection(mount) {
  const section = document.createElement("section");
  section.className = "settings-section settings-section--readonly";
  section.dataset.settingsSectionPanel = "diagnostics";
  section.hidden = activeSection !== "diagnostics";
  section.setAttribute("aria-labelledby", "settings-section-diagnostics-heading");

  const heading = document.createElement("h2");
  heading.id = "settings-section-diagnostics-heading";
  heading.className = "settings-section__heading";
  heading.textContent = t("settings.section.diagnostics");

  const body = document.getElementById("settings-diagnostics-body");
  if (body) {
    section.appendChild(heading);
    section.appendChild(body);
    mount.appendChild(section);
  }
}

function mountAboutSection(mount) {
  const aboutPanel = document.querySelector("#about-dialog .about-panel");
  if (!aboutPanel) {
    return;
  }
  const section = document.createElement("section");
  section.className = "settings-section settings-section--readonly";
  section.dataset.settingsSectionPanel = "about";
  section.hidden = activeSection !== "about";
  section.setAttribute("aria-labelledby", "settings-section-about-heading");

  const heading = document.createElement("h2");
  heading.id = "settings-section-about-heading";
  heading.className = "settings-section__heading";
  heading.textContent = t("settings.section.about");

  const actions = document.createElement("div");
  actions.className = "settings-about-actions";
  if (dom.aboutCopyVersion) {
    actions.appendChild(dom.aboutCopyVersion);
  }
  if (dom.aboutFeedback) {
    actions.appendChild(dom.aboutFeedback);
  }

  section.appendChild(heading);
  section.appendChild(aboutPanel);
  section.appendChild(actions);
  mount.appendChild(section);
}

function mountSettingsWorkspace() {
  if (settingsMounted) {
    return;
  }
  const mount = document.getElementById("settings-sections-mount");
  if (!mount) {
    return;
  }

  mountPlatformsSection(mount);
  mountNetworkSection(mount);
  mountDataSection(mount);
  mountApplicationSection(mount);
  mountDiagnosticsSection(mount);
  mountAboutSection(mount);

  if (dom.connectionsDialog) {
    dom.connectionsDialog.hidden = true;
  }
  ["rich-chat-dialog", "interface-dialog", "sound-dialog", "about-dialog"].forEach(function (id) {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.hidden = true;
    }
  });

  settingsMounted = true;
}

function bindSectionInputHandlers() {
  const workspace = document.getElementById("workspace-settings");
  if (!workspace) {
    return;
  }

  workspace.addEventListener("input", function (event) {
    const editable =
      event.target instanceof Element ? event.target.closest("[data-settings-editable]") : null;
    if (!editable) {
      return;
    }
    notifySectionInput(editable.getAttribute("data-settings-editable") || "");
  });

  workspace.addEventListener("change", function (event) {
    const editable =
      event.target instanceof Element ? event.target.closest("[data-settings-editable]") : null;
    if (!editable) {
      return;
    }
    const sectionId = editable.getAttribute("data-settings-editable") || "";
    notifySectionInput(sectionId);
    if (sectionId === "platforms" && event.target === dom.youtubeConnectionMode) {
      updateYouTubeConnectionModeUI();
    }
  });
}

function bindSettingsNavigation() {
  document.querySelectorAll("[data-settings-nav]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      const sectionId = link.getAttribute("data-settings-nav");
      if (!sectionId) {
        return;
      }
      if (parseWorkspaceHash(window.location.hash) !== "settings") {
        return;
      }
      event.preventDefault();
      selectSettingsSection(sectionId);
    });
  });
}

function syncSectionFromHash() {
  if (parseWorkspaceHash(window.location.hash) !== "settings") {
    return;
  }
  const section = parseSettingsSectionFromHash(window.location.hash) || DEFAULT_SETTINGS_SECTION;
  selectSettingsSection(section, { skipDirtyCheck: suppressNavigationGuard });
}

function interceptSettingsNavigation() {
  if (navigationGuardBound) {
    return;
  }
  navigationGuardBound = true;

  window.addEventListener("hashchange", function () {
    if (suppressNavigationGuard) {
      suppressNavigationGuard = false;
    }
    if (parseWorkspaceHash(window.location.hash) === "settings") {
      syncSectionFromHash();
    }
  });
}

function onSettingsEnter() {
  mountSettingsWorkspace();
  if (sectionBaselines.size === 0 && state.currentConfig) {
    resetAllSectionBaselines();
  }
  syncSectionFromHash();
  renderAllSectionChrome();
}

export function navigateToSettingsSection(sectionId) {
  const hash = settingsSectionHash(
    SETTINGS_SECTIONS.includes(sectionId) ? sectionId : DEFAULT_SETTINGS_SECTION
  );
  if (window.location.hash !== hash) {
    window.location.hash = hash;
    return;
  }
  if (parseWorkspaceHash(window.location.hash) === "settings") {
    onSettingsEnter();
    selectSettingsSection(sectionId, { skipDirtyCheck: true });
  }
}

export function initSettingsWorkspace() {
  mountSettingsWorkspace();
  bindSectionInputHandlers();
  bindSettingsNavigation();
  interceptSettingsNavigation();

  const refreshDiagnostics = document.getElementById("settings-diagnostics-refresh");
  if (refreshDiagnostics) {
    refreshDiagnostics.addEventListener("click", function () {
      loadStatus().catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
  }

  document.addEventListener("admin-config-applied", function () {
    refreshSectionBaselinesAfterConfigApply();
  });

  document.addEventListener("workspace-settings-enter", function () {
    onSettingsEnter();
  });

  if (parseWorkspaceHash(window.location.hash) === "settings") {
    onSettingsEnter();
  }
}

export function handleSettingsWorkspaceChange(workspaceId) {
  if (workspaceId === "settings") {
    document.dispatchEvent(new CustomEvent("workspace-settings-enter"));
  }
}
