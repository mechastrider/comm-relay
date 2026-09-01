import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { state } from "./state.js";
import { showBanner } from "./ui-shell.js";
import { t } from "./i18n-ui.js";
import { applyConfig } from "./settings.js";
import { buildActivatePresetBody, nextActivePresetSelection } from "./live-helpers.js";
import * as dom from "./dom.js";

let activateInFlight = false;
let queuedPresetId = null;

function presetOptions() {
  const overlay = state.currentConfig && state.currentConfig.overlay;
  const presets = overlay && Array.isArray(overlay.presets) ? overlay.presets : [];
  return presets.filter(function (preset) {
    return preset && typeof preset.id === "string" && preset.id !== "";
  });
}

function activePresetId() {
  const overlay = state.currentConfig && state.currentConfig.overlay;
  const id = overlay && overlay.active_preset_id;
  if (typeof id === "string" && id !== "") {
    return id;
  }
  const options = presetOptions();
  return options.length > 0 ? options[0].id : "";
}

function notifyActivateStateChanged() {
  document.dispatchEvent(new CustomEvent("overlay-activate-state-changed"));
}

/**
 * @param {HTMLSelectElement | null} select
 */
export function renderActivePresetSelect(select) {
  if (!select) {
    return;
  }
  const options = presetOptions();
  const current = activePresetId();
  const previousValue = select.value;

  select.textContent = "";
  if (options.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("live.activePresetNone");
    select.append(option);
    select.disabled = true;
    return;
  }

  options.forEach(function (preset) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name || preset.id;
    select.append(option);
  });

  select.disabled = activateInFlight;
  const nextValue = options.some(function (preset) {
    return preset.id === current;
  })
    ? current
    : options[0].id;
  select.value = nextValue;
  if (previousValue === nextValue) {
    select.value = nextValue;
  }
}

export function renderLiveActivePresetControl() {
  renderActivePresetSelect(dom.liveActivePreset);
}

export function getOnAirPresetId() {
  return activePresetId();
}

export function isOverlayActivateInFlight() {
  return activateInFlight;
}

export async function activateOverlayPreset(requestedId) {
  return activatePreset(requestedId);
}

async function activatePreset(requestedId) {
  const previousId = activePresetId();
  if (!requestedId) {
    return;
  }
  if (activateInFlight) {
    queuedPresetId = requestedId;
    if (dom.liveActivePreset) {
      dom.liveActivePreset.value = requestedId;
    }
    return;
  }
  if (requestedId === previousId) {
    return;
  }

  activateInFlight = true;
  notifyActivateStateChanged();
  if (dom.liveActivePreset) {
    dom.liveActivePreset.disabled = true;
  }

  try {
    const response = await fetch(apiURL("/api/overlay/activate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildActivatePresetBody(requestedId)),
    });
    const payload = await readJSON(response);
    if (!response.ok) {
      const message = mapHTTPError(response.status, payload && payload.error);
      const rollback = nextActivePresetSelection(previousId, requestedId, false);
      if (dom.liveActivePreset) {
        dom.liveActivePreset.value = rollback.selectedId;
      }
      showBanner("error", message);
      return;
    }

    applyConfig(payload);
    const applied = nextActivePresetSelection(previousId, requestedId, true);
    if (dom.liveActivePreset) {
      dom.liveActivePreset.value = applied.selectedId;
    }
    renderLiveActivePresetControl();
    document.dispatchEvent(new CustomEvent("live-active-preset-changed", {
      detail: { presetId: applied.activeId },
    }));
  } catch {
    const rollback = nextActivePresetSelection(previousId, requestedId, false);
    if (dom.liveActivePreset) {
      dom.liveActivePreset.value = rollback.selectedId;
    }
    showBanner("error", t("banner.cannotReach"));
  } finally {
    activateInFlight = false;
    notifyActivateStateChanged();
    if (dom.liveActivePreset) {
      dom.liveActivePreset.disabled = presetOptions().length === 0;
    }
    const nextQueued = queuedPresetId;
    queuedPresetId = null;
    if (nextQueued && nextQueued !== activePresetId()) {
      activatePreset(nextQueued).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    }
  }
}

/**
 * @param {HTMLSelectElement | null} select
 */
export function initActivePresetSelect(select) {
  if (!select || select.dataset.activePresetBound === "true") {
    return;
  }
  select.dataset.activePresetBound = "true";
  renderActivePresetSelect(select);
  select.addEventListener("change", function () {
    const requestedId = select.value;
    activatePreset(requestedId).catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
  });
}

export function initLiveActivePreset() {
  initActivePresetSelect(dom.liveActivePreset);

  document.addEventListener("admin-config-applied", function () {
    renderLiveActivePresetControl();
  });
}
