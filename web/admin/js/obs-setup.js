import * as dom from './dom.js';
import { state } from './state.js';
import { apiURL } from './api.js';
import { mountOverlayPreview, unmountOverlayPreview } from './overlay-preview.js';
import { getActivePresetID } from './overlay-appearance.js';
import { t } from './i18n-ui.js';

export function updateOBSSetupURLs() {
    document.querySelectorAll("[data-obs-url-path]").forEach(function (input) {
      let value = apiURL(input.dataset.obsUrlPath || "/");
      if ((input.dataset.obsUrlPath || "") === "/overlay") {
        const preset = getActivePresetID();
        if (preset) {
          value += (value.indexOf("?") === -1 ? "?" : "&") + "preset=" + encodeURIComponent(preset);
        }
      }
      input.value = value;
    });
    if (dom.obsOverlayOpen) {
      const preset = getActivePresetID();
      dom.obsOverlayOpen.href = apiURL("/overlay") + (preset ? "?preset=" + encodeURIComponent(preset) : "");
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
    const tabs = [
      { id: "setup", tab: dom.obsSetupTab, panel: dom.obsSetupPanel },
      { id: "appearance", tab: dom.obsAppearanceTab, panel: dom.obsAppearancePanel },
      { id: "highlights", tab: dom.obsHighlightsTab, panel: dom.obsHighlightsPanel },
    ];
    if (!tabs[0].tab || !tabs[1].tab || !tabs[0].panel || !tabs[1].panel) {
      return;
    }
    const current = section === "highlights" || section === "appearance" ? section : "setup";
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

export function initOBSSetup() {
    if (!dom.overlayDialog || !dom.obsSetupTab || !dom.obsAppearanceTab) {
      return;
    }

    updateOBSSetupURLs();
    document.addEventListener("overlay-preview-refresh", updateOBSSetupURLs);
    setOBSSection("setup");

    dom.overlayDialog.querySelectorAll("[data-obs-section]").forEach(function (button) {
      button.addEventListener("click", function () {
        setOBSSection(button.dataset.obsSection, {
          focusTab: button.getAttribute("role") !== "tab",
        });
      });
    });

    const tabs = [dom.obsSetupTab, dom.obsAppearanceTab, dom.obsHighlightsTab].filter(Boolean);
    tabs.forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
          return;
        }
        event.preventDefault();
        const ids = ["setup", "appearance", "highlights"];
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
