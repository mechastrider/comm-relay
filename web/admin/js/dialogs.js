import * as dom from './dom.js';
import { updateOBSSetupURLs, setOBSSection } from './obs-setup.js';
import { focusConnectionsField, setConnectionsSection } from './connections.js';
import { confirmDiscardSettingsSections } from './settings-workspace.js';
import { confirmDiscardStudioDraft, isStudioOverlayDirty, restoreStudioBaseline } from './studio.js';

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
    if (dialog === dom.connectionsDialog) {
      focusConnectionsField(el);
    }
  }

export function closeOpenDialogs() {
    document.querySelectorAll("dialog[open]").forEach(function (dialog) {
      dialog.close();
    });
  }

/**
 * @param {HTMLDialogElement} dialog
 * @returns {Promise<boolean>}
 */
async function confirmDialogClose(dialog) {
  if (dialog === dom.connectionsDialog) {
    return confirmDiscardSettingsSections(["platforms", "network"]);
  }
  if (dialog === dom.overlayDialog && isStudioOverlayDirty()) {
    const confirmed = await confirmDiscardStudioDraft();
    if (confirmed) {
      restoreStudioBaseline();
    }
    return confirmed;
  }
  return true;
}

/**
 * @param {HTMLDialogElement} dialog
 * @returns {Promise<boolean>}
 */
async function requestDialogClose(dialog) {
  if (!(await confirmDialogClose(dialog))) {
    return false;
  }
  dialog.close();
  return true;
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
          if (dialog === dom.connectionsDialog) {
            setConnectionsSection("twitch");
          }
        }
      });
    });

    document.querySelectorAll("[data-dialog-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = button.closest("dialog");
        if (dialog) {
          requestDialogClose(dialog);
        }
      });
    });

    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target !== dialog) {
          return;
        }
        event.preventDefault();
        requestDialogClose(dialog);
      });
      dialog.addEventListener("cancel", function (event) {
        if (dialog !== dom.connectionsDialog && dialog !== dom.overlayDialog) {
          return;
        }
        event.preventDefault();
        requestDialogClose(dialog);
      });
    });
  }
