import * as dom from "./dom.js";
import { state } from "./state.js";
import { apiURL } from "./api.js";
import { mountOverlayPreview, unmountOverlayPreview, applyPreviewSurface } from "./overlay-preview.js";
import { getActivePresetID, currentLeaderboardURL, updatePresetIsland } from "./overlay-appearance.js";
import { buildObsOverlayURL } from "./overlay-url.js";
import { t } from "./i18n-ui.js";

export function updateOBSSetupURLs() {
  document.querySelectorAll("[data-obs-url-path]").forEach(function (input) {
    input.value = apiURL(input.dataset.obsUrlPath || "/");
  });
  const overlayUrl = buildObsOverlayURL(getActivePresetID());
  if (dom.obsOverlayUrl) {
    dom.obsOverlayUrl.value = overlayUrl;
  }
  if (dom.obsOverlayOpen) {
    dom.obsOverlayOpen.href = overlayUrl;
  }
  if (dom.obsDockOpen) {
    dom.obsDockOpen.href = apiURL("/dock/messages");
  }
  const leaderboardUrl = currentLeaderboardURL();
  if (dom.obsLeaderboardUrl) {
    dom.obsLeaderboardUrl.value = leaderboardUrl;
  }
  if (dom.obsLeaderboardOpen) {
    dom.obsLeaderboardOpen.href = leaderboardUrl;
  }
}

export function resetOBSCopyFeedback() {
  if (state.obsCopyFeedbackTimer !== null) {
    window.clearTimeout(state.obsCopyFeedbackTimer);
    state.obsCopyFeedbackTimer = null;
  }
  if (state.obsCopyFeedbackButton) {
    state.obsCopyFeedbackButton.textContent =
      state.obsCopyFeedbackButton.dataset.copyDefaultText || t("obs.copyUrl");
    state.obsCopyFeedbackButton = null;
  }
}

export function showOBSCopyFeedback(button, message, copied) {
  resetOBSCopyFeedback();
  button.dataset.copyDefaultText = button.dataset.copyDefaultText || button.textContent;
  button.textContent = copied ? t("obs.copyCopied") : t("obs.copyFailed");
  state.obsCopyFeedbackButton = button;
  if (dom.obsCopyStatus) {
    dom.obsCopyStatus.textContent = message;
    dom.obsCopyStatus.classList.toggle("obs-copy-status--error", !copied);
  }
  state.obsCopyFeedbackTimer = window.setTimeout(function () {
    resetOBSCopyFeedback();
  }, 2500);
}

export function fallbackCopyFromInput(input) {
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

export async function copyOBSURL(input) {
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

export function setOBSSection(section, options) {
  const tabs = [
    { id: "setup", tab: dom.obsSetupTab, panel: dom.obsSetupPanel },
    { id: "appearance", tab: dom.obsAppearanceTab, panel: dom.obsAppearancePanel },
  ];
  if (!tabs[0].tab || !tabs[1].tab || !tabs[0].panel || !tabs[1].panel) {
    return;
  }
  const current = section === "appearance" ? section : "setup";
  tabs.forEach(function (item) {
    if (!item.tab || !item.panel) {
      return;
    }
    const selected = item.id === current;
    item.tab.setAttribute("aria-selected", selected ? "true" : "false");
    item.tab.tabIndex = selected ? 0 : -1;
    item.panel.hidden = !selected;
  });
  document.querySelectorAll("[data-obs-appearance-only]").forEach(function (element) {
    element.hidden = current === "setup";
  });

  if (dom.overlayDialog && dom.overlayDialog.open) {
    if (current === "appearance") {
      mountOverlayPreview();
    } else {
      unmountOverlayPreview();
    }
  }

  if (options && options.focusTab) {
    const focused = tabs.find(function (item) {
      return item.id === current;
    });
    if (focused && focused.tab) {
      focused.tab.focus();
    }
  }
}

function bindCopyButtons(root) {
  if (!root) {
    return;
  }
  root.querySelectorAll("[data-copy-obs-url]").forEach(function (button) {
    if (button.dataset.copyBound === "true") {
      return;
    }
    button.dataset.copyBound = "true";
    button.addEventListener("click", async function () {
      const input = document.getElementById(button.dataset.copyObsUrl);
      if (!input) {
        return;
      }
      const copied = await copyOBSURL(input);
      const label = button.dataset.copyLabel || "URL";
      showOBSCopyFeedback(
        button,
        copied ? t("obs.copyPasted", { label: label }) : t("obs.copyManual"),
        copied
      );
    });
  });
}

export function initOBSSetup() {
  if (!dom.overlayDialog || !dom.obsSetupTab || !dom.obsAppearanceTab) {
    return;
  }

  updateOBSSetupURLs();
  document.addEventListener("overlay-preview-refresh", updateOBSSetupURLs);
  setOBSSection("setup");

  dom.overlayDialog.querySelectorAll("[data-obs-section]").forEach(function (button) {
    button.addEventListener("click", function () {
      const sourceButton = button.closest("[data-obs-source-pane]");
      const pane = sourceButton && sourceButton.getAttribute("data-obs-source-pane");
      if (button.dataset.obsSection === "appearance" && (pane === "leaderboard" || pane === "chat")) {
        applyPreviewSurface(pane);
        updatePresetIsland();
      }
      setOBSSection(button.dataset.obsSection, {
        focusTab: button.getAttribute("role") !== "tab",
      });
    });
  });

  const tabs = [dom.obsSetupTab, dom.obsAppearanceTab].filter(Boolean);
  tabs.forEach(function (tab) {
    tab.addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
        return;
      }
      event.preventDefault();
      const ids = ["setup", "appearance"];
      const currentIndex = Math.max(0, ids.indexOf(tab.getAttribute("data-obs-section")));
      let nextIndex = currentIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = ids.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % ids.length;
      } else {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
      }
      setOBSSection(ids[nextIndex], { focusTab: true });
    });
  });

  bindCopyButtons(dom.overlayDialog);

  function setOBSSource(name) {
    const source = name === "leaderboard" || name === "dock" ? name : "chat";
    document.querySelectorAll("[data-obs-source]").forEach(function (button) {
      if (button.disabled) {
        return;
      }
      if (button.getAttribute("data-obs-source") === source) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
    document.querySelectorAll("[data-obs-source-pane]").forEach(function (element) {
      const pane = element.getAttribute("data-obs-source-pane");
      if (pane === "browser") {
        element.hidden = source === "dock";
        return;
      }
      element.hidden = pane !== source;
    });
    const title = document.getElementById("obs-source-title");
    const summary = document.getElementById("obs-source-summary");
    const badge = document.getElementById("obs-source-badge");
    const eyebrow = document.getElementById("obs-source-eyebrow");
    if (source === "leaderboard") {
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
    } else if (source === "dock") {
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

  document.querySelectorAll("[data-obs-source]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.disabled) {
        return;
      }
      setOBSSource(button.getAttribute("data-obs-source"));
    });
  });
  setOBSSource("chat");

  if (dom.obsLeaderboardPeriod) {
    dom.obsLeaderboardPeriod.addEventListener("change", updateOBSSetupURLs);
  }
  if (dom.overlayLeaderboardPeriod) {
    dom.overlayLeaderboardPeriod.addEventListener("change", updateOBSSetupURLs);
  }

  dom.overlayDialog.addEventListener("close", function () {
    resetOBSCopyFeedback();
    if (dom.obsCopyStatus) {
      dom.obsCopyStatus.textContent = "";
      dom.obsCopyStatus.classList.remove("obs-copy-status--error");
    }
  });
}
