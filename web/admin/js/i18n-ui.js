import {
  applyDomTranslations,
  getLocale,
  normalizeLocale,
  readCachedLocale,
  setLocale,
  t,
  writeCachedLocale,
  LOCALE_ENGLISH,
  LOCALE_RUSSIAN,
} from "/shared/i18n.js?v=16";
import * as dom from "./dom.js";
import { state } from "./state.js";
import { renderAboutVersion } from "./about.js";
import { renderDiagnostics } from "./status.js";
import { renderStreamStatus } from "./streams.js";
import { renderRecentMessages } from "./messages.js";
import { renderSettingsState } from "./ui-shell.js";
import { updateOverlayPreviewNote } from "./overlay-preview.js";

let lastDiagnosticsPayload = null;
let lastStreamsPayload = null;

export function initI18n() {
  const cached = readCachedLocale();
  if (cached) {
    setLocale(cached);
  }
  applyDomTranslations(document);
  renderSettingsState();
  updateOverlayPreviewNote();
}

export function applyAdminLocale(locale) {
  const next = setLocale(locale);
  writeCachedLocale(next);
  applyDomTranslations(document);
  renderSettingsState();
  renderAboutVersion();
  updateOverlayPreviewNote();
  if (state.recentMessageCache.length > 0) {
    renderRecentMessages(state.recentMessageCache, { force: true });
  }
  if (lastDiagnosticsPayload) {
    renderDiagnostics(lastDiagnosticsPayload);
  }
  if (lastStreamsPayload) {
    renderStreamStatus(lastStreamsPayload);
  }
}

export function rememberDiagnosticsPayload(payload) {
  lastDiagnosticsPayload = payload;
}

export function rememberStreamsPayload(payload) {
  lastStreamsPayload = payload;
}

export function localeFromConfig(config) {
  const raw = config && config.admin && config.admin.time_locale;
  return normalizeLocale(raw || LOCALE_RUSSIAN);
}

export function bindLocaleSelect() {
  if (!dom.timeLocaleInput) {
    return;
  }
  dom.timeLocaleInput.addEventListener("change", function () {
    applyAdminLocale(dom.timeLocaleInput.value);
  });
}

export { t, getLocale, setLocale, LOCALE_ENGLISH, LOCALE_RUSSIAN };
