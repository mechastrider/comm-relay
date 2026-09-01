import * as dom from "./dom.js";
import { apiURL } from "./api.js";
import { t } from "./i18n-ui.js";
import {
  readStudioSetupState,
  writeStudioSetupState,
} from "./studio-helpers.js";
import { bindCopyButtons, resetOBSCopyFeedback } from "./obs-setup.js";
import { updatePresetIsland } from "./overlay-appearance.js";

/** @type {HTMLElement | null} */
let lastOpener = null;

/**
 * @returns {boolean}
 */
export function isAddToObsDismissed() {
  return readStudioSetupState(window.localStorage) !== "unseen";
}

export function syncStudioSetupReminder() {
  if (!dom.studioSetupReminder) {
    return;
  }
  const setupState = readStudioSetupState(window.localStorage);
  dom.studioSetupReminder.hidden = setupState === "completed";
  dom.studioSetupReminder.dataset.setupState = setupState;
}

/**
 * @param {{ opener?: HTMLElement | null, dismissOnClose?: boolean }} [options]
 */
export function openStudioAddToObs(options) {
  if (!dom.studioAddToObsDialog) {
    return;
  }
  lastOpener =
    options && options.opener
      ? options.opener
      : dom.studioAddToObsOpenButton || dom.studioWorkspace;
  updatePresetIsland();
  updateStudioAddToObsDockURL();
  if (typeof dom.studioAddToObsDialog.showModal === "function") {
    dom.studioAddToObsDialog.showModal();
  }
}

/**
 * @param {"seen"|"skipped"|"completed"} outcome
 */
export function finishStudioAddToObs(outcome) {
  writeStudioSetupState(window.localStorage, outcome);
  syncStudioSetupReminder();
  closeStudioAddToObs();
}

export function closeStudioAddToObs() {
  if (!dom.studioAddToObsDialog || !dom.studioAddToObsDialog.open) {
    return;
  }
  resetOBSCopyFeedback();
  if (dom.studioAddToObsCopyStatus) {
    dom.studioAddToObsCopyStatus.textContent = "";
    dom.studioAddToObsCopyStatus.classList.remove("obs-copy-status--error");
  }
  dom.studioAddToObsDialog.close();
  if (lastOpener && typeof lastOpener.focus === "function") {
    lastOpener.focus();
  }
}

export function maybeAutoOpenStudioAddToObs() {
  syncStudioSetupReminder();
  if (readStudioSetupState(window.localStorage) !== "unseen") {
    return;
  }
  openStudioAddToObs();
}

export function updateStudioAddToObsDockURL() {
  if (dom.studioAddToObsDockUrl) {
    dom.studioAddToObsDockUrl.value = apiURL("/dock/messages");
    dom.studioAddToObsDockUrl.title = dom.studioAddToObsDockUrl.value;
  }
  if (dom.studioAddToObsDockOpen) {
    dom.studioAddToObsDockOpen.href = apiURL("/dock/messages");
  }
}

/**
 * @param {"chat"|"leaderboard"|"alerts"|"dock"} source
 */
function setStudioAddToObsSource(source) {
  const current =
    source === "leaderboard" || source === "dock" || source === "alerts" ? source : "chat";
  if (!dom.studioAddToObsDialog) {
    return;
  }
  dom.studioAddToObsDialog.querySelectorAll("[data-studio-add-to-obs-source]").forEach(function (button) {
    const selected = button.getAttribute("data-studio-add-to-obs-source") === current;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    if (selected) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  dom.studioAddToObsDialog.querySelectorAll("[data-studio-add-to-obs-pane]").forEach(function (element) {
    const pane = element.getAttribute("data-studio-add-to-obs-pane");
    if (pane === "browser") {
      element.hidden = current === "dock";
      return;
    }
    if (pane === "dock") {
      element.hidden = current !== "dock";
      return;
    }
    element.hidden = pane !== current;
  });

  const title = dom.studioAddToObsSourceTitle;
  const summary = dom.studioAddToObsSourceSummary;
  const badge = dom.studioAddToObsSourceBadge;
  const eyebrow = dom.studioAddToObsSourceEyebrow;
  if (current === "leaderboard") {
    if (title) {
      title.textContent = t("obs.leaderboard");
    }
    if (summary) {
      summary.textContent = t("obs.leaderboardSummary");
    }
    if (eyebrow) {
      eyebrow.textContent = t("obs.browserSource");
    }
    if (badge) {
      badge.textContent = t("obs.visibleToViewers");
      badge.classList.add("obs-audience-badge--live");
    }
  } else if (current === "alerts") {
    if (title) {
      title.textContent = t("obs.alerts");
    }
    if (summary) {
      summary.textContent = t("obs.alertsSummary");
    }
    if (eyebrow) {
      eyebrow.textContent = t("obs.browserSource");
    }
    if (badge) {
      badge.textContent = t("obs.visibleToViewers");
      badge.classList.add("obs-audience-badge--live");
    }
  } else if (current === "dock") {
    if (title) {
      title.textContent = t("obs.messageDock");
    }
    if (summary) {
      summary.textContent = t("obs.dockSummary");
    }
    if (eyebrow) {
      eyebrow.textContent = t("obs.customDock");
    }
    if (badge) {
      badge.textContent = t("obs.onlyVisibleToYou");
      badge.classList.remove("obs-audience-badge--live");
    }
  } else {
    if (title) {
      title.textContent = t("obs.onStreamOverlay");
    }
    if (summary) {
      summary.textContent = t("obs.overlaySummary");
    }
    if (eyebrow) {
      eyebrow.textContent = t("obs.browserSource");
    }
    if (badge) {
      badge.textContent = t("obs.visibleToViewers");
      badge.classList.add("obs-audience-badge--live");
    }
  }
}

export function initStudioAddToObs() {
  if (!dom.studioAddToObsDialog) {
    return;
  }

  bindCopyButtons(dom.studioAddToObsDialog);
  setStudioAddToObsSource("chat");
  syncStudioSetupReminder();

  if (dom.studioAddToObsOpenButton) {
    dom.studioAddToObsOpenButton.addEventListener("click", function () {
      openStudioAddToObs({ opener: dom.studioAddToObsOpenButton });
    });
  }

  dom.studioAddToObsDialog.querySelectorAll("[data-studio-add-to-obs-source]").forEach(function (button) {
    button.addEventListener("click", function () {
      const source = button.getAttribute("data-studio-add-to-obs-source");
      if (source === "chat" || source === "leaderboard" || source === "alerts" || source === "dock") {
        setStudioAddToObsSource(source);
      }
    });
  });

  dom.studioAddToObsDialog.querySelectorAll("[data-studio-add-to-obs-action]").forEach(function (button) {
    button.addEventListener("click", function () {
      const action = button.getAttribute("data-studio-add-to-obs-action");
      finishStudioAddToObs(
        action === "done" ? "completed" : action === "later" ? "skipped" : "seen"
      );
    });
  });

  dom.studioAddToObsDialog.addEventListener("click", function (event) {
    if (event.target === dom.studioAddToObsDialog) {
      finishStudioAddToObs("seen");
    }
  });

  dom.studioAddToObsDialog.addEventListener("close", function () {
    resetOBSCopyFeedback();
    if (dom.studioAddToObsCopyStatus) {
      dom.studioAddToObsCopyStatus.textContent = "";
      dom.studioAddToObsCopyStatus.classList.remove("obs-copy-status--error");
    }
    if (lastOpener && typeof lastOpener.focus === "function") {
      lastOpener.focus();
    }
  });

  dom.studioAddToObsDialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    finishStudioAddToObs("seen");
  });

  if (dom.studioAddToObsLeaderboardPeriod) {
    dom.studioAddToObsLeaderboardPeriod.addEventListener("change", function () {
      updatePresetIsland();
    });
  }

  document.addEventListener("overlay-preview-refresh", updateStudioAddToObsDockURL);
  document.addEventListener("admin-config-applied", updateStudioAddToObsDockURL);
  window.addEventListener("admin-locale-applied", function () {
    const selected = dom.studioAddToObsDialog.querySelector(
      "[data-studio-add-to-obs-source][aria-pressed='true']"
    );
    const source = selected ? selected.getAttribute("data-studio-add-to-obs-source") : "chat";
    setStudioAddToObsSource(
      source === "leaderboard" || source === "dock" || source === "alerts" ? source : "chat"
    );
  });
}
