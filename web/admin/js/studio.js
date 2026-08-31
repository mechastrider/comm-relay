import * as dom from "./dom.js";
import { state } from "./state.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { t } from "./i18n-ui.js";
import {
  cloneOverlayAppearanceDraft,
  overlayDraftIsDirty,
  buildFollowActiveURLForSurface,
  readStudioModePreference,
  readStudioSurfaceRailCollapsedPreference,
  shouldDisableUseOnStream,
  shouldShowUseOnStream,
  writeStudioModePreference,
  writeStudioSurfaceRailCollapsedPreference,
} from "./studio-helpers.js";
import { resolveStudioDraftAfterConfigApply } from "./config-apply-restore.js";
import {
  applyOverlayAppearance,
  collectOverlayAppearance,
  updatePresetIsland,
  getActivePresetID,
} from "./overlay-appearance.js";
import {
  getPreviewSurface,
  mountOverlayPreview,
  unmountOverlayPreview,
  scheduleOverlayPreviewRefresh,
} from "./overlay-preview.js";
import {
  applyConfig,
  composeConfigUpdateFromServer,
  fetchPublicConfig,
  validateClient,
} from "./settings.js";
import {
  applyServerFieldErrors,
  clearFieldErrors,
  showBanner,
  hideBanner,
} from "./ui-shell.js";
import { parseWorkspaceHash, workspaceHash } from "./workspace-router.js";
import {
  activateOverlayPreset,
  getOnAirPresetId,
  isOverlayActivateInFlight,
} from "./live-active-preset.js";
import { bindCopyButtons } from "./obs-setup.js";
import { initStudioAddToObs, maybeAutoOpenStudioAddToObs } from "./studio-add-to-obs.js";

/** @type {Record<string, unknown> | null} */
let baseline = null;
/** @type {Record<string, unknown> | null} */
let draft = null;
let publishInFlight = false;
let navigationGuardBound = false;
/** @type {import("./workspace-router.js").WorkspaceId} */
let lastWorkspace = "live";
let suppressNavigationGuard = false;
let skipStudioReenter = false;

/**
 * @returns {boolean}
 */
export function isStudioWorkspaceActive() {
  return parseWorkspaceHash(window.location.hash) === "studio";
}

/**
 * @returns {boolean}
 */
export function isStudioOverlayDirty() {
  if (!baseline || !draft) {
    return false;
  }
  return overlayDraftIsDirty(baseline, draft);
}

export function updateStudioFollowCopy() {
  if (!dom.studioFollowUrl && !dom.studioFollowUrlCompact) {
    return;
  }
  const surface = getPreviewSurface();
  const period =
    (dom.overlayLeaderboardPeriod && dom.overlayLeaderboardPeriod.value) ||
    (dom.studioAddToObsLeaderboardPeriod && dom.studioAddToObsLeaderboardPeriod.value) ||
    (dom.obsLeaderboardPeriod && dom.obsLeaderboardPeriod.value) ||
    "session";
  const href = buildFollowActiveURLForSurface(surface, {
    origin: window.location.origin,
    period: period,
  });
  [dom.studioFollowUrl, dom.studioFollowUrlCompact].filter(Boolean).forEach(function (input) {
    input.value = href;
    input.title = href;
  });
}

function syncDraftFromForm() {
  draft = collectOverlayAppearance();
}

function renderStudioDirtyState() {
  const dirty = isStudioOverlayDirty();
  [dom.studioDirtyStatus, dom.studioCompactDirtyStatus].filter(Boolean).forEach(function (status) {
    status.textContent = dirty ? t("studio.dirty") : t("studio.published");
    status.classList.toggle("studio-dirty-status--dirty", dirty);
  });
  [dom.studioPublishButton, dom.studioCompactPublishButton].filter(Boolean).forEach(function (button) {
    button.disabled = publishInFlight || !dirty;
    button.setAttribute("aria-busy", publishInFlight ? "true" : "false");
  });
  updatePresetIsland();
  updateStudioUseOnStream();
}

function restoreStudioDraftAfterConfigApply() {
  const overlay = state.currentConfig && state.currentConfig.overlay ? state.currentConfig.overlay : {};
  const resolved = resolveStudioDraftAfterConfigApply({
    serverOverlay: overlay,
    baseline,
    draft,
    isDirty: isStudioOverlayDirty(),
  });
  baseline = resolved.nextBaseline;
  draft = resolved.nextDraft;
  applyOverlayAppearance(resolved.overlayToApply);
  renderStudioDirtyState();
  scheduleOverlayPreviewRefresh();
}

function resetStudioDraftFromConfig() {
  const overlay = state.currentConfig && state.currentConfig.overlay ? state.currentConfig.overlay : {};
  baseline = cloneOverlayAppearanceDraft(overlay);
  draft = cloneOverlayAppearanceDraft(baseline);
  applyOverlayAppearance(draft);
  renderStudioDirtyState();
  scheduleOverlayPreviewRefresh();
}

export function notifyStudioOverlayChanged() {
  if (!isStudioWorkspaceActive()) {
    return;
  }
  syncDraftFromForm();
  renderStudioDirtyState();
}

export function restoreStudioBaseline() {
  if (!baseline) {
    return;
  }
  draft = cloneOverlayAppearanceDraft(baseline);
  applyOverlayAppearance(draft);
  renderStudioDirtyState();
  scheduleOverlayPreviewRefresh();
}

/**
 * @returns {boolean}
 */
export function confirmDiscardStudioDraft() {
  if (!isStudioOverlayDirty()) {
    return true;
  }
  return window.confirm(t("studio.discardConfirm"));
}

function updateStudioUseOnStream() {
  const editedId = getActivePresetID();
  const onAirId = getOnAirPresetId();
  const show = shouldShowUseOnStream(editedId, onAirId);
  const inFlight = isOverlayActivateInFlight();
  const dirty = isStudioOverlayDirty();
  [dom.studioUseOnStream, dom.studioCompactUseOnStream].filter(Boolean).forEach(function (button) {
    button.hidden = !show;
    button.disabled = shouldDisableUseOnStream(show, dirty, inFlight);
    button.setAttribute("aria-busy", inFlight ? "true" : "false");
    button.title = dirty && show ? t("studio.publishBeforeUse") : "";
  });
  [dom.studioUseOnStreamHint, dom.studioCompactUseOnStreamHint].filter(Boolean).forEach(function (hint) {
    hint.hidden = !show || !dirty;
  });
}

/**
 * @param {"essentials"|"all"} mode
 * @param {boolean} persist
 */
function applyStudioMode(mode, persist) {
  if (!dom.studioWorkspace) {
    return;
  }
  const current = mode === "all" ? "all" : "essentials";
  dom.studioWorkspace.dataset.studioMode = current;
  [dom.studioModeEssentials, dom.studioModeAll].filter(Boolean).forEach(function (button) {
    button.setAttribute("aria-pressed", button.dataset.studioMode === current ? "true" : "false");
  });
  if (persist) {
    writeStudioModePreference(window.localStorage, current);
  }
}

/**
 * @param {boolean} collapsed
 * @param {boolean} persist
 */
function applyStudioSurfaceRail(collapsed, persist) {
  if (!dom.studioWorkspace || !dom.studioSurfaceCollapse) {
    return;
  }
  dom.studioWorkspace.classList.toggle("studio-surface-rail--collapsed", collapsed);
  dom.studioSurfaceCollapse.setAttribute("aria-expanded", collapsed ? "false" : "true");
  const labelKey = collapsed ? "studio.expandSurfaces" : "studio.collapseSurfaces";
  const label = t(labelKey);
  dom.studioSurfaceCollapse.setAttribute("aria-label", label);
  const tooltip = dom.studioSurfaceCollapse.querySelector(".ui-tooltip");
  if (tooltip) {
    tooltip.textContent = label;
  }
  if (persist) {
    writeStudioSurfaceRailCollapsedPreference(window.localStorage, collapsed);
  }
}

function initStudioViewPreferences() {
  applyStudioMode(readStudioModePreference(window.localStorage), false);
  applyStudioSurfaceRail(
    readStudioSurfaceRailCollapsedPreference(window.localStorage),
    false
  );
  [dom.studioModeEssentials, dom.studioModeAll].filter(Boolean).forEach(function (button) {
    button.addEventListener("click", function () {
      applyStudioMode(button.dataset.studioMode === "all" ? "all" : "essentials", true);
    });
  });
  if (dom.studioSurfaceCollapse) {
    dom.studioSurfaceCollapse.addEventListener("click", function () {
      const collapsed = dom.studioWorkspace
        ? dom.studioWorkspace.classList.contains("studio-surface-rail--collapsed")
        : false;
      applyStudioSurfaceRail(!collapsed, true);
    });
  }
}

function onStudioEnter() {
  resetStudioDraftFromConfig();
  updateStudioFollowCopy();
  updateStudioUseOnStream();
  mountOverlayPreview();
  maybeAutoOpenStudioAddToObs();
}

function onStudioLeave() {
  unmountOverlayPreview();
}

function handleWorkspaceChange() {
  if (isStudioWorkspaceActive()) {
    onStudioEnter();
    return;
  }
  onStudioLeave();
}

function interceptHashNavigation() {
  if (navigationGuardBound) {
    return;
  }
  navigationGuardBound = true;
  lastWorkspace = parseWorkspaceHash(window.location.hash);

  window.addEventListener("hashchange", function () {
    if (suppressNavigationGuard) {
      suppressNavigationGuard = false;
      lastWorkspace = parseWorkspaceHash(window.location.hash);
      if (skipStudioReenter && lastWorkspace === "studio") {
        skipStudioReenter = false;
        return;
      }
      handleWorkspaceChange();
      return;
    }

    const nextWorkspace = parseWorkspaceHash(window.location.hash);
    if (lastWorkspace === "studio" && nextWorkspace !== "studio" && isStudioOverlayDirty()) {
      const targetHash = window.location.hash;
      skipStudioReenter = true;
      suppressNavigationGuard = true;
      window.location.hash = workspaceHash("studio");
      if (!confirmDiscardStudioDraft()) {
        lastWorkspace = "studio";
        return;
      }
      skipStudioReenter = false;
      restoreStudioBaseline();
      suppressNavigationGuard = true;
      window.location.hash = targetHash;
      lastWorkspace = parseWorkspaceHash(window.location.hash);
      handleWorkspaceChange();
      return;
    }

    lastWorkspace = nextWorkspace;
    handleWorkspaceChange();
  });

  window.addEventListener("beforeunload", function (event) {
    if (isStudioWorkspaceActive() && isStudioOverlayDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

async function publishStudioDraft() {
  if (publishInFlight || !isStudioOverlayDirty()) {
    return;
  }
  hideBanner();
  clearFieldErrors();
  syncDraftFromForm();

  publishInFlight = true;
  renderStudioDirtyState();

  try {
    const latest = await fetchPublicConfig();
    const payload = composeConfigUpdateFromServer(latest, draft);
    if (!validateClient(payload, { focusStudio: true })) {
      showBanner("error", t("banner.checkFields"));
      return;
    }

    const response = await fetch(apiURL("/api/config/update"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await readJSON(response);
    if (!response.ok) {
      const firstInvalid =
        body && body.fields ? applyServerFieldErrors(body.fields) : null;
      if (firstInvalid) {
        firstInvalid.focus();
      }
      showBanner("error", mapHTTPError(response.status, body && body.error));
      return;
    }

    applyConfig(body);
    baseline = cloneOverlayAppearanceDraft(collectOverlayAppearance());
    draft = cloneOverlayAppearanceDraft(baseline);
    renderStudioDirtyState();
    showBanner("success", t("studio.publishSuccess"));
  } catch {
    showBanner("error", t("banner.cannotReach"));
  } finally {
    publishInFlight = false;
    renderStudioDirtyState();
  }
}

export function initStudio() {
  initStudioAddToObs();
  initStudioViewPreferences();
  interceptHashNavigation();

  [dom.studioPublishButton, dom.studioCompactPublishButton].filter(Boolean).forEach(function (button) {
    button.addEventListener("click", function () {
      publishStudioDraft().catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
  });

  if (dom.studioWorkspace) {
    bindCopyButtons(dom.studioWorkspace);
  }

  [dom.studioUseOnStream, dom.studioCompactUseOnStream].filter(Boolean).forEach(function (button) {
    button.addEventListener("click", function () {
      if (isStudioOverlayDirty()) {
        return;
      }
      const editedId = getActivePresetID();
      activateOverlayPreset(editedId).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
  });

  document.addEventListener("studio-overlay-changed", function () {
    notifyStudioOverlayChanged();
    updateStudioUseOnStream();
  });

  document.addEventListener("admin-config-applied", function () {
    if (!isStudioWorkspaceActive()) {
      updateStudioUseOnStream();
      return;
    }
    restoreStudioDraftAfterConfigApply();
    updateStudioUseOnStream();
  });

  document.addEventListener("live-active-preset-changed", function () {
    updatePresetIsland();
    updateStudioFollowCopy();
    updateStudioUseOnStream();
  });

  document.addEventListener("overlay-activate-state-changed", function () {
    updateStudioUseOnStream();
  });

  document.addEventListener("overlay-preview-surface-changed", function () {
    updateStudioFollowCopy();
  });

  window.addEventListener("admin-locale-applied", function () {
    renderStudioDirtyState();
    updateStudioUseOnStream();
    applyStudioSurfaceRail(
      Boolean(dom.studioWorkspace && dom.studioWorkspace.classList.contains("studio-surface-rail--collapsed")),
      false
    );
  });

  if (isStudioWorkspaceActive()) {
    onStudioEnter();
  } else {
    renderStudioDirtyState();
  }
}
