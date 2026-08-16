import * as dom from './dom.js';
import { state } from './state.js';
import { apiURL } from './api.js';
import { mountOverlayPreview, unmountOverlayPreview } from './overlay-preview.js';
import { t } from './i18n-ui.js';

export function updateOBSSetupURLs() {
    document.querySelectorAll("[data-obs-url-path]").forEach(function (input) {
      input.value = apiURL(input.dataset.obsUrlPath || "/");
    });
    if (dom.obsOverlayOpen) {
      dom.obsOverlayOpen.href = apiURL("/overlay");
    }
    if (dom.obsDockOpen) {
      dom.obsDockOpen.href = apiURL("/dock/messages");
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
    if (!dom.obsSetupTab || !dom.obsAppearanceTab || !dom.obsSetupPanel || !dom.obsAppearancePanel) {
      return;
    }
    const showAppearance = section === "appearance";
    dom.obsSetupTab.setAttribute("aria-selected", showAppearance ? "false" : "true");
    dom.obsSetupTab.tabIndex = showAppearance ? -1 : 0;
    dom.obsAppearanceTab.setAttribute("aria-selected", showAppearance ? "true" : "false");
    dom.obsAppearanceTab.tabIndex = showAppearance ? 0 : -1;
    dom.obsSetupPanel.hidden = showAppearance;
    dom.obsAppearancePanel.hidden = !showAppearance;
    document.querySelectorAll("[data-obs-appearance-only]").forEach(function (element) {
      element.hidden = !showAppearance;
    });

    if (dom.overlayDialog && dom.overlayDialog.open) {
      if (showAppearance) {
        mountOverlayPreview();
      } else {
        unmountOverlayPreview();
      }
    }

    if (options && options.focusTab) {
      (showAppearance ? dom.obsAppearanceTab : dom.obsSetupTab).focus();
    }
  }

export function initOBSSetup() {
    if (!dom.overlayDialog || !dom.obsSetupTab || !dom.obsAppearanceTab) {
      return;
    }

    updateOBSSetupURLs();
    setOBSSection("setup");

    dom.overlayDialog.querySelectorAll("[data-obs-section]").forEach(function (button) {
      button.addEventListener("click", function () {
        setOBSSection(button.dataset.obsSection, {
          focusTab: button.getAttribute("role") !== "tab",
        });
      });
    });

    [dom.obsSetupTab, dom.obsAppearanceTab].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
          return;
        }
        event.preventDefault();
        const showAppearance = event.key === "ArrowRight" || event.key === "End";
        setOBSSection(showAppearance ? "appearance" : "setup", { focusTab: true });
      });
    });

    dom.overlayDialog.querySelectorAll("[data-copy-obs-url]").forEach(function (button) {
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
            ? t("obs.copyPasted", { label: label })
            : t("obs.copyManual"),
          copied
        );
      });
    });

    dom.overlayDialog.addEventListener("close", function () {
      resetOBSCopyFeedback();
      if (dom.obsCopyStatus) {
        dom.obsCopyStatus.textContent = "";
        dom.obsCopyStatus.classList.remove("obs-copy-status--error");
      }
    });
  }
