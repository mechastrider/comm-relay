import * as dom from './dom.js';
import { updateOBSSetupURLs, setOBSSection } from './obs-setup.js';

export function openDialogForElement(el) {
    if (!el) {
      return;
    }
    const dialog = el.closest("dialog");
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    }
    if (dialog === dom.overlayDialog) {
      setOBSSection("appearance");
    }
  }

export function closeOpenDialogs() {
    document.querySelectorAll("dialog[open]").forEach(function (dialog) {
      dialog.close();
    });
  }

export function initSettingsDialogs() {
    document.querySelectorAll("[data-dialog-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = document.getElementById(button.getAttribute("data-dialog-target"));
        if (dialog && typeof dialog.showModal === "function") {
          dialog.showModal();
          if (dialog === dom.overlayDialog) {
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
