import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { showBanner } from "./ui-shell.js";
import { state } from "./state.js";
import * as dom from "./dom.js";
import { t } from "./i18n-ui.js";
import { parseWorkspaceHash } from "./workspace-router.js";

export const SUPPORT_TELEGRAM_URL = "https://t.me/mechastrider_apps/2";
export const PROJECT_GITHUB_URL = "https://github.com/mechastrider/comm-relay";

function aboutProductLine() {
  const version = state.appVersion || "unknown";
  return "CommRelay " + version;
}

export function renderAboutVersion() {
  if (!dom.aboutVersion) {
    return;
  }
  const version = state.appVersion || "unknown";
  dom.aboutVersion.textContent = t("about.version", { version: version });
}

function setAboutFeedback(message) {
  if (!dom.aboutFeedback) {
    return;
  }
  if (!message) {
    dom.aboutFeedback.hidden = true;
    dom.aboutFeedback.textContent = "";
    return;
  }
  dom.aboutFeedback.hidden = false;
  dom.aboutFeedback.textContent = message;
}

async function openSupportLink(url) {
  setAboutFeedback("");
  try {
    const response = await fetch(apiURL("/api/support/open"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    });
    const body = await readJSON(response);
    if (!response.ok) {
      showBanner("error", mapHTTPError(response.status, body && body.error) || t("banner.couldNotOpenLink"));
      return;
    }
  } catch {
    showBanner("error", t("banner.cannotReach"));
  }
}

async function copyAboutVersion() {
  setAboutFeedback("");
  try {
    await navigator.clipboard.writeText(aboutProductLine());
    setAboutFeedback(t("about.versionCopied"));
  } catch {
    setAboutFeedback(t("about.copyFailed"));
  }
}

export function initAboutWorkspace() {
  if (dom.aboutTelegram) {
    dom.aboutTelegram.addEventListener("click", function () {
      void openSupportLink(SUPPORT_TELEGRAM_URL);
    });
  }

  if (dom.aboutGitHub) {
    dom.aboutGitHub.addEventListener("click", function () {
      void openSupportLink(PROJECT_GITHUB_URL);
    });
  }

  if (dom.aboutCopyVersion) {
    dom.aboutCopyVersion.addEventListener("click", function () {
      void copyAboutVersion();
    });
  }

  window.addEventListener("hashchange", function () {
    if (parseWorkspaceHash(window.location.hash) === "about") {
      renderAboutVersion();
      setAboutFeedback("");
    }
  });
}
