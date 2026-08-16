import en from "./locales/en.js";
import ru from "./locales/ru.js";

export const UI_LOCALE_STORAGE_KEY = "commRelay.uiLocale";
export const LOCALE_RUSSIAN = "ru-RU";
export const LOCALE_ENGLISH = "en-GB";

const catalogs = {
  [LOCALE_RUSSIAN]: ru,
  [LOCALE_ENGLISH]: en,
};

let currentLocale = LOCALE_RUSSIAN;

function htmlLang(locale) {
  return locale === LOCALE_ENGLISH ? "en" : "ru";
}

export function normalizeLocale(raw) {
  return raw === LOCALE_ENGLISH ? LOCALE_ENGLISH : LOCALE_RUSSIAN;
}

export function getLocale() {
  return currentLocale;
}

export function readCachedLocale() {
  try {
    const cached = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (cached === LOCALE_ENGLISH || cached === LOCALE_RUSSIAN) {
      return cached;
    }
  } catch {
    /* localStorage may be unavailable */
  }
  return null;
}

export function writeCachedLocale(locale) {
  try {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, normalizeLocale(locale));
  } catch {
    /* ignore */
  }
}

export function setLocale(locale) {
  currentLocale = normalizeLocale(locale);
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = htmlLang(currentLocale);
  }
  return currentLocale;
}

export function t(key, vars) {
  const catalog = catalogs[currentLocale] || catalogs[LOCALE_RUSSIAN];
  let text = catalog[key];
  if (typeof text !== "string") {
    const fallback = catalogs[LOCALE_ENGLISH][key];
    text = typeof fallback === "string" ? fallback : key;
  }
  if (!vars || typeof vars !== "object") {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, function (_match, name) {
    return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : "";
  });
}

function applyAttributeTranslation(root, attributeName) {
  const selector = "[" + attributeName + "]";
  root.querySelectorAll(selector).forEach(function (element) {
    const key = element.getAttribute(attributeName);
    if (!key) {
      return;
    }
    const targetAttr = attributeName === "data-i18n-aria-label"
      ? "aria-label"
      : attributeName === "data-i18n-title"
        ? "title"
        : "placeholder";
    element.setAttribute(targetAttr, t(key));
  });
}

export function applyDomTranslations(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll("[data-i18n]").forEach(function (element) {
    const key = element.getAttribute("data-i18n");
    if (key) {
      element.textContent = t(key);
    }
  });
  scope.querySelectorAll("[data-i18n-html]").forEach(function (element) {
    const key = element.getAttribute("data-i18n-html");
    if (key) {
      element.innerHTML = t(key);
    }
  });
  applyAttributeTranslation(scope, "data-i18n-aria-label");
  applyAttributeTranslation(scope, "data-i18n-title");
  applyAttributeTranslation(scope, "data-i18n-placeholder");
}

export function translateFieldError(fieldKey, serverMessage) {
  const key = "field." + fieldKey;
  const translated = t(key);
  if (translated !== key) {
    return translated;
  }
  return typeof serverMessage === "string" ? serverMessage : "";
}

export function translatePlatformState(state) {
  const key = "platform." + String(state || "unknown").replace(/\s+/g, "_");
  const translated = t(key);
  return translated !== key ? translated : String(state || "unknown").replace(/_/g, " ");
}

export { en, ru };
