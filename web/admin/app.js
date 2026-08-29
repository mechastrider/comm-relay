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
import { initOverlayAppearance, updatePresetIsland } from "./js/overlay-appearance.js";
import { initConnectionsTabs } from "./js/connections.js";
import { initSettingsDialogs } from "./js/dialogs.js";
import { initAboutDialog } from "./js/about.js";
import { initMessageSoundControls } from "./js/sound.js";
import { initI18n, bindLocaleSelect, t } from "./js/i18n-ui.js";
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
import { initAudienceViewers, initNewStreamControl } from "./js/viewers.js";
import { connectMessageWebSocket, disconnectMessageWebSocket } from "./js/ws.js";
import { initWorkspaceRouter } from "./js/workspace-router.js";
import { initLiveTabs } from "./js/live-tabs.js";
import { initLiveLeaderboard } from "./js/live-leaderboard.js";
import { initLiveStatistics } from "./js/live-statistics.js";
import { initLiveActivePreset, renderLiveActivePresetControl } from "./js/live-active-preset.js";

initI18n();
initWorkspaceRouter(document, t);

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
      showBanner("error", t("banner.youtubeAuthFailed"));
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
    if (
      event.target.closest("#obs-appearance-panel") &&
      event.target.id !== "overlay-preset-select" &&
      event.target.id !== "obs-overlay-preset-select"
    ) {
      updatePresetIsland();
    }
  }
});
dom.form.addEventListener("change", function (event) {
  if (!(event.target instanceof Element) || !event.target.closest("[data-preview-only]")) {
    markSettingsDirty();
    if (
      event.target.closest("#obs-appearance-panel") &&
      event.target.id !== "overlay-preset-select" &&
      event.target.id !== "obs-overlay-preset-select"
    ) {
      updatePresetIsland();
    }
  }
});
dom.refreshMessages.addEventListener("click", function () {
  loadRecentMessages().catch(function () {
    showBanner("error", t("banner.cannotLoadMessages"));
  });
});

handleOAuthQuery();
initSidebarToggle();
initOverlayPreview();
initOBSSetup();
initOverlayAppearance();
initConnectionsTabs();
initSettingsDialogs();
initAboutDialog();
initMessageSoundControls();
bindLocaleSelect();
initAudienceViewers();
initLiveTabs();
initLiveLeaderboard(function () {
  /* period change handled in leaderboard module */
});
initLiveStatistics();
initLiveActivePreset();
initNewStreamControl();

if (dom.shellDiagnosticsButton && dom.shellStatusBar) {
  dom.shellDiagnosticsButton.addEventListener("click", function () {
    dom.shellStatusBar.scrollIntoView({ behavior: "smooth", block: "nearest" });
    dom.shellStatusBar.setAttribute("tabindex", "-1");
    dom.shellStatusBar.focus({ preventScroll: true });
  });
}

renderSettingsState();

refreshAll()
  .catch(function () {
    if (!state.currentConfig) {
      markSettingsUnavailable();
    }
    showBanner("error", t("banner.cannotReach"));
  })
  .finally(function () {
    state.soundReady = true;
    renderLiveActivePresetControl();
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
