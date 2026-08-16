"use strict";

import * as dom from "./js/dom.js";
import { state } from "./js/state.js";
import { handleOAuthQuery } from "./js/status.js";
import {
  initSidebarToggle,
  renderSettingsState,
  markSettingsDirty,
  markSettingsUnavailable,
  showBanner,
} from "./js/ui-shell.js";
import { initOverlayPreview, updateOverlayPreviewScale } from "./js/overlay-preview.js";
import { initOBSSetup } from "./js/obs-setup.js";
import { initSettingsDialogs } from "./js/dialogs.js";
import { initAboutDialog } from "./js/about.js";
import { initMessageSoundControls } from "./js/sound.js";
import {
  bindFieldClear,
  refreshAll,
  saveSettings,
  loadStatus,
  loadRecentMessages,
  normalizeVkChannel,
  updateYouTubeConnectionModeUI,
  startYouTubeOAuth,
} from "./js/settings.js";
import { connectMessageWebSocket, disconnectMessageWebSocket } from "./js/ws.js";

Object.keys(dom.fieldInputs).forEach(bindFieldClear);

if (dom.youtubeConnectionMode) {
  dom.youtubeConnectionMode.addEventListener("change", function () {
    updateYouTubeConnectionModeUI();
    markSettingsDirty();
  });
}

if (dom.youtubeConnect) {
  dom.youtubeConnect.addEventListener("click", function () {
    startYouTubeOAuth().catch(function () {
      showBanner("error", "YouTube authorization failed.");
    });
  });
}

if (dom.vkChannel) {
  dom.vkChannel.addEventListener("blur", function () {
    const normalized = normalizeVkChannel(dom.vkChannel.value);
    if (normalized !== dom.vkChannel.value.trim().toLowerCase()) {
      dom.vkChannel.value = normalized;
    }
  });
}

dom.form.addEventListener("submit", saveSettings);
dom.form.addEventListener("input", function (event) {
  if (!(event.target instanceof Element) || !event.target.closest("[data-preview-only]")) {
    markSettingsDirty();
  }
});
dom.form.addEventListener("change", function (event) {
  if (!(event.target instanceof Element) || !event.target.closest("[data-preview-only]")) {
    markSettingsDirty();
  }
});
dom.refreshMessages.addEventListener("click", function () {
  loadRecentMessages().catch(function () {
    showBanner("error", "Cannot load recent messages.");
  });
});

handleOAuthQuery();
initSidebarToggle();
initOverlayPreview();
initOBSSetup();
initSettingsDialogs();
initAboutDialog();
initMessageSoundControls();

renderSettingsState();

refreshAll()
  .catch(function () {
    if (!state.currentConfig) {
      markSettingsUnavailable();
    }
    showBanner("error", "Cannot reach CommRelay — is it running?");
  })
  .finally(function () {
    state.soundReady = true;
    connectMessageWebSocket();
  });

state.statusTimer = window.setInterval(function () {
  loadStatus().catch(function () {
    /* keep last known status */
  });
}, 5000);

state.messagesTimer = window.setInterval(function () {
  loadRecentMessages({ playSound: true }).catch(function () {
    /* keep last known messages */
  });
}, 5000);

window.addEventListener("beforeunload", function () {
  disconnectMessageWebSocket();
  if (state.overlayPreviewResizeObserver) {
    state.overlayPreviewResizeObserver.disconnect();
  }
  window.removeEventListener("resize", updateOverlayPreviewScale);
  window.clearInterval(state.statusTimer);
  window.clearInterval(state.messagesTimer);
});
