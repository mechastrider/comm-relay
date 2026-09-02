import * as dom from "./dom.js";
import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";
import { copyOBSURL } from "./obs-setup.js";
import {
  createOverlayDebugController,
  createOverlayDebugRequestQueue,
} from "./overlay-debug-controller.js";
import { buildOverlayPreviewURL, getPreviewSurface, setOverlayPreviewTestMode } from "./overlay-preview.js";
import {
  DEBUG_SCENARIOS,
  LIMITS,
  buildOverlayTestURL,
  isDebugScenarioCompatible,
  scenariosForSurface,
  testPathForSurface,
  validateDebugScenario,
} from "./overlay-debug-helpers.js";

export {
  DEBUG_SCENARIOS,
  buildOverlayTestURL,
  isDebugScenarioCompatible,
  scenariosForSurface,
  testPathForSurface,
  validateDebugScenario,
};

let active = false;
let lastSnapshotURL = "";
let appearanceRefreshTimer = null;
let retryAction = null;
const debugController = createOverlayDebugController();
const debugRequestQueue = createOverlayDebugRequestQueue();

function setRetryVisible(visible) {
  if (dom.overlayDebugRetry) {
    dom.overlayDebugRetry.hidden = !visible;
  }
}

function setStatus(key, params) {
  if (dom.overlayDebugStatus) {
    dom.overlayDebugStatus.textContent = t(key, params);
  }
}

function syncActionAvailability() {
  const busy = debugController.isBusy();
  if (dom.overlayDebugRun) {
    dom.overlayDebugRun.disabled = busy;
    dom.overlayDebugRun.setAttribute("aria-busy", busy ? "true" : "false");
  }
  if (dom.overlayDebugReplay) {
    dom.overlayDebugReplay.disabled = debugController.replayPayload(getPreviewSurface()) === null;
    dom.overlayDebugReplay.setAttribute("aria-busy", busy ? "true" : "false");
  }
  if (dom.overlayDebugReset) {
    dom.overlayDebugReset.disabled = !debugController.canStartReset();
    dom.overlayDebugReset.setAttribute("aria-busy", busy ? "true" : "false");
  }
}

function setFieldError(field, message) {
  const input = document.getElementById("overlay-debug-" + field);
  const error = document.getElementById("overlay-debug-" + field + "-error");
  if (input) {
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }
  if (error) {
    error.hidden = !message;
    error.textContent = message || "";
  }
}

function clearErrors() {
  ["scenario", "display_name", "message", "label", "points"].forEach(function (field) {
    setFieldError(field, "");
  });
}

function applicableFields(scenario) {
  if (scenario === "leaderboard_update") {
    return new Set(["display_name", "points"]);
  }
  if (scenario === "message") {
    return new Set(["display_name", "message"]);
  }
  if (scenario === "command_alert") {
    return new Set(["display_name", "label"]);
  }
  return new Set(["display_name", "message", "label", "points"]);
}

function renderScenarioOptions() {
  if (!dom.overlayDebugScenario) {
    return;
  }
  const selected = getPreviewSurface();
  const scenarios = scenariosForSurface(selected);
  const prior = scenarios.includes(dom.overlayDebugScenario.value)
    ? dom.overlayDebugScenario.value
    : scenarios[0];
  dom.overlayDebugScenario.replaceChildren();
  scenarios.forEach(function (scenario) {
    const option = document.createElement("option");
    option.value = scenario;
    option.textContent = t("studio.debugScenario." + scenario);
    dom.overlayDebugScenario.append(option);
  });
  dom.overlayDebugScenario.value = prior;
  updateApplicableFields();
}

function updateApplicableFields() {
  const fields = applicableFields(dom.overlayDebugScenario ? dom.overlayDebugScenario.value : "message");
  document.querySelectorAll("[data-overlay-debug-field]").forEach(function (element) {
    const field = element.getAttribute("data-overlay-debug-field");
    const enabled = fields.has(field);
    element.hidden = !enabled;
    const input = element.querySelector("input, textarea");
    if (input) {
      input.disabled = !enabled;
    }
  });
}

function currentPayload() {
  const scenario = dom.overlayDebugScenario ? dom.overlayDebugScenario.value : "message";
  const applicable = applicableFields(scenario);
  const payload = { scenario };
  ["display_name", "message", "label"].forEach(function (field) {
    const input = document.getElementById("overlay-debug-" + field);
    if (applicable.has(field) && input && input.value.trim() !== "") {
      payload[field] = input.value;
    }
  });
  const points = document.getElementById("overlay-debug-points");
  if (applicable.has("points") && points && points.value.trim() !== "") {
    payload.points = Number(points.value);
  }
  return payload;
}

function refreshURLs() {
  const surface = getPreviewSurface();
  if (dom.overlayDebugStableURL) {
    dom.overlayDebugStableURL.value = buildOverlayTestURL(surface, { origin: window.location.origin });
  }
  if (!lastSnapshotURL && dom.overlayDebugSnapshotURL) {
    lastSnapshotURL = currentSnapshotURL(surface);
    dom.overlayDebugSnapshotURL.value = lastSnapshotURL;
  }
}

function currentSnapshotURL(surface) {
  const preview = buildOverlayPreviewURL("");
  preview.pathname = testPathForSurface(surface);
  ["preview", "sample", "preview_background", "_preview_revision"].forEach(function (key) {
    preview.searchParams.delete(key);
  });
  return buildOverlayTestURL(surface, { origin: preview.origin, appearance: Object.fromEntries(preview.searchParams) });
}

function enterTestMode() {
  active = true;
  lastSnapshotURL = "";
  if (dom.overlayDebugPanel) {
    dom.overlayDebugPanel.hidden = false;
  }
  if (dom.overlayDebugToggle) {
    dom.overlayDebugToggle.setAttribute("aria-expanded", "true");
  }
  renderScenarioOptions();
  refreshURLs();
  setOverlayPreviewTestMode(true, currentSnapshotURL(getPreviewSurface()));
  setRetryVisible(false);
  setStatus("studio.debugReady");
  syncActionAvailability();
  const heading = dom.overlayDebugHeading;
  if (heading) {
    heading.focus({ preventScroll: true });
  }
}

export function deactivateOverlayDebugPanel(options = {}) {
  if (appearanceRefreshTimer !== null) {
    window.clearTimeout(appearanceRefreshTimer);
    appearanceRefreshTimer = null;
  }
  active = false;
  debugController.close();
  lastSnapshotURL = "";
  retryAction = null;
  if (dom.overlayDebugPanel) {
    dom.overlayDebugPanel.hidden = true;
  }
  if (dom.overlayDebugToggle) {
    dom.overlayDebugToggle.setAttribute("aria-expanded", "false");
    if (options.restoreFocus) {
      dom.overlayDebugToggle.focus({ preventScroll: true });
    }
  }
  setRetryVisible(false);
  setOverlayPreviewTestMode(false);
  syncActionAvailability();
}

async function copyURL(input, snapshot) {
  if (!input) {
    return;
  }
  if (snapshot) {
    lastSnapshotURL = currentSnapshotURL(getPreviewSurface());
    input.value = lastSnapshotURL;
  } else {
    input.value = buildOverlayTestURL(getPreviewSurface(), { origin: window.location.origin });
  }
  if (await copyOBSURL(input)) {
    setStatus("studio.debugCopied");
  } else {
    setStatus("studio.debugManualCopy");
  }
}

async function fire(payload) {
  clearErrors();
  const errors = validateDebugScenario(payload);
  if (Object.keys(errors).length > 0) {
    Object.keys(errors).forEach(function (field) {
      const key = field === "points" ? "studio.debugPointsInvalid" : "studio.debugTooLong";
      setFieldError(field, t(key, { max: LIMITS[field] }));
    });
    const first = document.getElementById("overlay-debug-" + Object.keys(errors)[0]);
    if (first) {
      first.focus();
    }
    setStatus("studio.debugValidationError");
    return;
  }
  const requestID = debugController.beginScenario(payload);
  if (!requestID) {
    return;
  }
  setRetryVisible(false);
  retryAction = null;
  syncActionAvailability();
  setStatus("studio.debugBusy");
  try {
    const result = await debugRequestQueue.enqueue(async function () {
      const response = await fetch(apiURL("/api/overlay-debug/scenario/fire"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { response, body: await readJSON(response) };
    });
    const { response, body } = result;
    if (!response.ok) {
      const fields = body && body.fields ? body.fields : {};
      Object.keys(fields).forEach(function (field) {
        setFieldError(field, fields[field]);
      });
      throw new Error(mapHTTPError(response.status, body && body.error));
    }
    if (!debugController.completeRequest(requestID, payload)) {
      return;
    }
    retryAction = null;
    setRetryVisible(false);
    setStatus(body.delivered_clients === 0 ? "studio.debugZeroReceivers" : "studio.debugSuccess", {
      scenario: t("studio.debugScenario." + payload.scenario),
      count: body.delivered_clients,
    });
  } catch (error) {
    if (!debugController.failRequest(requestID)) {
      return;
    }
    setStatus("studio.debugError", { error: error instanceof Error ? error.message : t("banner.requestFailed") });
    retryAction = function () { return fire(payload); };
    if (dom.overlayDebugRetry) {
      dom.overlayDebugRetry.hidden = false;
    }
  } finally {
    syncActionAvailability();
  }
}

async function reset() {
  const requestID = debugController.beginReset();
  if (!requestID) {
    return;
  }
  setRetryVisible(false);
  retryAction = null;
  syncActionAvailability();
  setStatus("studio.debugBusy");
  try {
    const result = await debugRequestQueue.enqueue(async function () {
      const response = await fetch(apiURL("/api/overlay-debug/session/reset"), { method: "POST" });
      return { response, body: await readJSON(response) };
    });
    const { response, body } = result;
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, body && body.error));
    }
    if (!debugController.completeRequest(requestID)) {
      return;
    }
    setStatus("studio.debugReset", { count: body.delivered_clients });
    retryAction = null;
    setRetryVisible(false);
  } catch (error) {
    if (!debugController.failRequest(requestID)) {
      return;
    }
    setStatus("studio.debugError", { error: error instanceof Error ? error.message : t("banner.requestFailed") });
    retryAction = reset;
    setRetryVisible(true);
  } finally {
    syncActionAvailability();
  }
}

function scheduleDraftAppearanceRefresh() {
  if (!active || appearanceRefreshTimer !== null) {
    return;
  }
  appearanceRefreshTimer = window.setTimeout(function () {
    appearanceRefreshTimer = null;
    if (!active) {
      return;
    }
    lastSnapshotURL = currentSnapshotURL(getPreviewSurface());
    if (dom.overlayDebugSnapshotURL) {
      dom.overlayDebugSnapshotURL.value = lastSnapshotURL;
    }
    setOverlayPreviewTestMode(true, lastSnapshotURL);
  }, 180);
}

export function initOverlayDebugPanel() {
  if (!dom.overlayDebugToggle || !dom.overlayDebugPanel) {
    return;
  }
  dom.overlayDebugToggle.addEventListener("click", function () {
    if (active) {
      deactivateOverlayDebugPanel({ restoreFocus: true });
    } else {
      enterTestMode();
    }
  });
  if (dom.overlayDebugClose) {
    dom.overlayDebugClose.addEventListener("click", function () {
      deactivateOverlayDebugPanel({ restoreFocus: true });
    });
  }
  if (dom.overlayDebugScenario) {
    dom.overlayDebugScenario.addEventListener("change", updateApplicableFields);
  }
  if (dom.overlayDebugRun) {
    dom.overlayDebugRun.addEventListener("click", function () { fire(currentPayload()); });
  }
  if (dom.overlayDebugReplay) {
    dom.overlayDebugReplay.addEventListener("click", function () {
      const payload = debugController.replayPayload(getPreviewSurface());
      if (payload) {
        fire(payload);
      }
    });
  }
  if (dom.overlayDebugReset) {
    dom.overlayDebugReset.addEventListener("click", reset);
  }
  if (dom.overlayDebugRetry) {
    dom.overlayDebugRetry.addEventListener("click", function () {
      if (retryAction) {
        retryAction();
      }
    });
  }
  if (dom.overlayDebugStableCopy) {
    dom.overlayDebugStableCopy.addEventListener("click", function () { copyURL(dom.overlayDebugStableURL, false); });
  }
  if (dom.overlayDebugSnapshotCopy) {
    dom.overlayDebugSnapshotCopy.addEventListener("click", function () { copyURL(dom.overlayDebugSnapshotURL, true); });
  }
  document.addEventListener("overlay-preview-surface-changed", function () {
    if (active) {
      debugController.clearIncompatible(getPreviewSurface());
      lastSnapshotURL = "";
      renderScenarioOptions();
      refreshURLs();
      setOverlayPreviewTestMode(true, currentSnapshotURL(getPreviewSurface()));
      syncActionAvailability();
    }
  });
  document.addEventListener("studio-overlay-changed", scheduleDraftAppearanceRefresh);
  window.addEventListener("admin-locale-applied", function () {
    if (active) {
      renderScenarioOptions();
      setStatus("studio.debugReady");
      syncActionAvailability();
    }
  });
}
