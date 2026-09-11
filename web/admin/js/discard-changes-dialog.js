import * as dom from "./dom.js";

/** @type {Promise<boolean> | null} */
let pendingConfirmation = null;

/**
 * @param {{ message: string, opener?: HTMLElement | null }} options
 * @returns {Promise<boolean>}
 */
export function confirmDiscardChanges(options) {
  if (pendingConfirmation) {
    return pendingConfirmation;
  }
  if (!dom.discardChangesDialog || typeof dom.discardChangesDialog.showModal !== "function") {
    return Promise.resolve(false);
  }

  const opener = options.opener && options.opener.isConnected ? options.opener : null;
  if (dom.discardChangesMessage) {
    dom.discardChangesMessage.textContent = options.message;
  }
  dom.discardChangesDialog.returnValue = "cancel";
  pendingConfirmation = new Promise(function (resolve) {
    dom.discardChangesDialog.addEventListener("close", function () {
      const shouldDiscard = dom.discardChangesDialog.returnValue === "discard";
      pendingConfirmation = null;
      if (!shouldDiscard && opener) {
        opener.focus({ preventScroll: true });
      }
      resolve(shouldDiscard);
    }, { once: true });
    dom.discardChangesDialog.showModal();
  });
  return pendingConfirmation;
}

export function initDiscardChangesDialog() {
  if (dom.discardChangesCancel) {
    dom.discardChangesCancel.addEventListener("click", function () {
      dom.discardChangesDialog?.close("cancel");
    });
  }
  if (dom.discardChangesConfirm) {
    dom.discardChangesConfirm.addEventListener("click", function () {
      dom.discardChangesDialog?.close("discard");
    });
  }
}
