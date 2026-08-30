import * as dom from "./dom.js";
import { state } from "./state.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { t } from "./i18n-ui.js";
import {
  cloneOverlayAppearanceDraft,
  overlayDraftIsDirty,
  buildFollowActiveURLForSurface,
} from "./studio-helpers.js";
import { resolveStudioDraftAfterConfigApply } from "./config-apply-restore.js";
import {
  applyOverlayAppearance,
  collectOverlayAppearance,
  updatePresetIsland,
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
import { initActivePresetSelect, renderActivePresetSelect } from "./live-active-preset.js";
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
  if (!dom.studioFollowUrl) {
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
  dom.studioFollowUrl.value = href;
  dom.studioFollowUrl.title = href;
}

function syncDraftFromForm() {
  draft = collectOverlayAppearance();
}

function renderStudioDirtyState() {
  if (!dom.studioDirtyStatus || !dom.studioPublishButton) {
    return;
  }
  const dirty = isStudioOverlayDirty();
  dom.studioDirtyStatus.textContent = dirty ? t("studio.dirty") : t("studio.published");
  dom.studioDirtyStatus.classList.toggle("studio-dirty-status--dirty", dirty);
  dom.studioPublishButton.disabled = publishInFlight || !dirty;
  dom.studioPublishButton.setAttribute("aria-busy", publishInFlight ? "true" : "false");
  updatePresetIsland();
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

function onStudioEnter() {
  resetStudioDraftFromConfig();
  renderActivePresetSelect(dom.studioActivePreset);
  updateStudioFollowCopy();
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
  interceptHashNavigation();

  if (dom.studioPublishButton) {
    dom.studioPublishButton.addEventListener("click", function () {
      publishStudioDraft().catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
  }

  if (dom.studioWorkspace) {
    bindCopyButtons(dom.studioWorkspace);
  }

  initActivePresetSelect(dom.studioActivePreset);

  document.addEventListener("studio-overlay-changed", function () {
    notifyStudioOverlayChanged();
  });

  document.addEventListener("admin-config-applied", function () {
    if (!isStudioWorkspaceActive()) {
      renderActivePresetSelect(dom.studioActivePreset);
      return;
    }
    restoreStudioDraftAfterConfigApply();
    renderActivePresetSelect(dom.studioActivePreset);
  });

  document.addEventListener("live-active-preset-changed", function () {
    updatePresetIsland();
    updateStudioFollowCopy();
  });

  document.addEventListener("overlay-preview-surface-changed", function () {
    updateStudioFollowCopy();
  });

  window.addEventListener("admin-locale-applied", function () {
    renderStudioDirtyState();
  });

  if (isStudioWorkspaceActive()) {
    onStudioEnter();
  } else {
    renderStudioDirtyState();
  }
}
