import { t } from "/shared/i18n.js?v=17";

export function apiURL(path) {
  return window.location.origin + path;
}

export function mapHTTPError(status, bodyError) {
  if (bodyError) {
    return bodyError;
  }
  if (status === 400) {
    return t("banner.checkFields");
  }
  if (status >= 500) {
    return t("banner.serverError");
  }
  return t("banner.requestFailed");
}

export async function readJSON(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return payload;
}
