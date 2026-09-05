"use strict";

import * as dom from "./js/dom.js";
import { state } from "./js/state.js";
import { handleOAuthQuery } from "./js/status.js";
import {
  renderSettingsState,
  markSettingsUnavailable,
  showBanner,
} from "./js/ui-shell.js";
import { initOverlayPreview, updateOverlayPreviewScale } from "./js/overlay-preview.js";
import { initOBSSetup } from "./js/obs-setup.js?v=2";
import { initOverlayAppearance, updatePresetIsland } from "./js/overlay-appearance.js";
import { initConnectionsTabs } from "./js/connections.js";
import { initSettingsDialogs } from "./js/dialogs.js";
import { initAboutWorkspace } from "./js/about.js";
import { initMessageSoundControls } from "./js/sound.js";
import { initI18n, bindLocaleSelect, t } from "./js/i18n-ui.js";
import {
  bindFieldClear,
  refreshAll,
  loadStatus,
  loadRecentMessages,
  normalizeVkChannel,
  updateYouTubeConnectionModeUI,
  startYouTubeOAuth,
} from "./js/settings.js";
import { initStudio } from "./js/studio.js";
import {
  handleAudienceWorkspaceChange,
  initAudienceViewers,
  initNewStreamControl,
} from "./js/viewers.js";
import { initAudienceTabs } from "./js/audience-tabs.js";
import { initCommandsCatalog, ensureCommandsLoaded } from "./js/commands-catalog.js";
import { initAwardsCatalog, ensureAwardsLoaded } from "./js/awards-catalog.js";
import { connectMessageWebSocket, disconnectMessageWebSocket } from "./js/ws.js";
import { initWorkspaceRouter } from "./js/workspace-router.js";
import { initLiveTabs, handleLiveWorkspaceChange } from "./js/live-tabs.js";
import { initLiveLeaderboard } from "./js/live-leaderboard.js";
import { initLiveStatistics } from "./js/live-statistics.js";
import { initLiveActivePreset, renderLiveActivePresetControl } from "./js/live-active-preset.js";
import { initSidebar } from "./js/sidebar.js?v=1";
import {
  initSettingsWorkspace,
  handleSettingsWorkspaceChange,
} from "./js/settings-workspace.js";

function isStudioOverlayField(target) {
  return (
    target.closest("[data-studio-overlay]") ||
    target.closest("#workspace-studio") ||
    target.closest("#studio-inspector-mount")
  );
}

function shouldHandleStudioOverlayInput(event) {
  if (!(event.target instanceof Element)) {
    return false;
  }
  if (event.target.closest("[data-preview-only]")) {
    return false;
  }
  return isStudioOverlayField(event.target);
}

if (dom.youtubeConnectionMode) {
  dom.youtubeConnectionMode.addEventListener("change", function () {
    updateYouTubeConnectionModeUI();
  });
}

if (dom.youtubeConnect) {
  dom.youtubeConnect.addEventListener("click", function () {
    startYouTubeOAuth().catch(function () {
      showBanner("error", t("banner.youtubeAuthFailed"));
    });
  });
}

initI18n();
initSidebar(document, t);
initWorkspaceRouter(document, t, {
  onWorkspaceChange: function (workspaceId) {
    handleSettingsWorkspaceChange(workspaceId);
    handleLiveWorkspaceChange(workspaceId);
    handleAudienceWorkspaceChange(workspaceId);
  },
});

Object.keys(dom.fieldInputs).forEach(bindFieldClear);

if (dom.vkChannel) {
  dom.vkChannel.addEventListener("blur", function () {
    const normalized = normalizeVkChannel(dom.vkChannel.value);
    if (normalized !== dom.vkChannel.value.trim().toLowerCase()) {
      dom.vkChannel.value = normalized;
    }
  });
}

dom.form.addEventListener("submit", function (event) {
  event.preventDefault();
});
dom.form.addEventListener("input", function (event) {
  if (!shouldHandleStudioOverlayInput(event)) {
    return;
  }
  if (
    event.target instanceof Element &&
    event.target.id !== "overlay-preset-select" &&
    event.target.id !== "obs-overlay-preset-select"
  ) {
    updatePresetIsland();
  }
});
dom.form.addEventListener("change", function (event) {
  if (!shouldHandleStudioOverlayInput(event)) {
    return;
  }
  if (
    event.target instanceof Element &&
    event.target.id !== "obs-overlay-preset-select"
  ) {
    updatePresetIsland();
  }
});
dom.refreshMessages.addEventListener("click", function () {
  loadRecentMessages().catch(function () {
    showBanner("error", t("banner.cannotLoadMessages"));
  });
});

handleOAuthQuery();
initOverlayPreview();
initOBSSetup();
initOverlayAppearance();
initConnectionsTabs();
initSettingsDialogs();
initAboutWorkspace();
initMessageSoundControls();
bindLocaleSelect();
initAudienceViewers();
initAudienceTabs({
  onTabChange: function (tab) {
    if (tab === "commands") {
      ensureCommandsLoaded();
    } else if (tab === "awards") {
      ensureAwardsLoaded();
    }
  },
});
initCommandsCatalog();
initAwardsCatalog();
initLiveTabs();
initLiveLeaderboard(function () {
  /* period change handled in leaderboard module */
});
initLiveStatistics();
initLiveActivePreset();
initStudio();
initSettingsWorkspace();
initNewStreamControl();

if (dom.shellDiagnosticsButton) {
  dom.shellDiagnosticsButton.addEventListener("click", function () {
    window.location.hash = "#settings/diagnostics";
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
