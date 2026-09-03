import * as dom from './dom.js';
import { state } from './state.js';
import { BANNER_SUCCESS_DISMISS_MS } from './constants.js';
import { t } from './i18n-ui.js';
import { translateFieldError } from '/shared/i18n.js?v=17';

function translateFieldErrorMessage(fieldKey, serverMessage) {
  return translateFieldError(fieldKey, serverMessage);
}

export function showBanner(kind, message) {
    if (state.bannerTimer) {
      window.clearTimeout(state.bannerTimer);
      state.bannerTimer = null;
    }
    dom.banner.hidden = false;
    dom.banner.className = "banner notice banner--" + kind;
    dom.banner.textContent = message;
    if (kind === "success") {
      state.bannerTimer = window.setTimeout(function () {
        state.bannerTimer = null;
        hideBanner();
      }, BANNER_SUCCESS_DISMISS_MS);
    }
  }

export function hideBanner() {
    if (state.bannerTimer) {
      window.clearTimeout(state.bannerTimer);
      state.bannerTimer = null;
    }
    dom.banner.hidden = true;
    dom.banner.textContent = "";
    dom.banner.className = "banner";
  }

export function setSaveButtonsDisabled(disabled) {
    dom.saveButtons.forEach(function (button) {
      button.disabled = disabled;
    });
  }

export function setSettingsStateText(message, stateClass) {
    if (dom.settingsState) {
      dom.settingsState.textContent = message;
      dom.settingsState.className = stateClass ? "settings-state " + stateClass : "settings-state";
    }
    if (dom.footerSettingsState) {
      dom.footerSettingsState.textContent = message;
      dom.footerSettingsState.className = stateClass || "";
    }
  }

export function renderSettingsState() {
    if (state.saveInFlight) {
      setSettingsStateText(t("shell.saving"), "");
      setSaveButtonsDisabled(true);
      return;
    }

    if (!state.settingsLoaded) {
      setSettingsStateText(t("shell.loadingSettings"), "");
      setSaveButtonsDisabled(true);
      return;
    }

    if (state.settingsDirty) {
      setSettingsStateText(t("shell.unsavedChanges"), "settings-state--dirty");
      setSaveButtonsDisabled(false);
      return;
    }

    setSettingsStateText(t("shell.settingsSaved"), "settings-state--saved");
    setSaveButtonsDisabled(true);
  }

export function markSettingsDirty() {
    if (!state.settingsLoaded || state.saveInFlight) {
      return;
    }
    state.settingsDirty = true;
    renderSettingsState();
  }

export function markSettingsClean() {
    state.settingsLoaded = true;
    state.settingsDirty = false;
    renderSettingsState();
  }

export function markSettingsUnavailable() {
    state.settingsLoaded = false;
    state.settingsDirty = false;
    renderSettingsState();
    setSettingsStateText(t("shell.settingsUnavailable"), "");
  }

export function clearFieldErrors() {
    Object.keys(dom.fieldErrors).forEach(function (key) {
      const el = dom.fieldErrors[key];
      const input = dom.fieldInputs[key];
      if (el) {
        el.hidden = true;
        el.textContent = "";
      }
      if (input) {
        input.removeAttribute("aria-invalid");
        restoreFieldHint(input);
      }
    });
  }

export function applyServerFieldErrors(fields) {
    if (!fields || typeof fields !== "object") {
      return null;
    }
    clearFieldErrors();
    let firstInvalid = null;
    Object.keys(fields).forEach(function (key) {
      const message = fields[key];
      if (typeof message !== "string" || message === "") {
        return;
      }
      setFieldError(key, translateFieldErrorMessage(key, message));
      if (!firstInvalid && dom.fieldInputs[key]) {
        firstInvalid = dom.fieldInputs[key];
      }
    });
    return firstInvalid;
  }

function restoreFieldHint(input) {
  const hintID = input.dataset.fieldHintId;
  if (hintID) {
    input.setAttribute("aria-describedby", hintID);
    return;
  }
  input.removeAttribute("aria-describedby");
}

export function setFieldError(field, message) {
    const el = dom.fieldErrors[field];
    const input = dom.fieldInputs[field];
    if (!el || !input) {
      return;
    }
    el.hidden = false;
    el.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", el.id);
  }
