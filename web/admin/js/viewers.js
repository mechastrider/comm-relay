import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { showBanner } from "./ui-shell.js";
import { t } from "./i18n-ui.js";
import { initialsForName } from "/shared/chat-render.js?v=17";
import { setRegionState } from "./shell-state.js";
import { getLeaderboardPeriod, setLeaderboardPeriod } from "./live-leaderboard.js";
import { setLiveTab } from "./live-tabs.js";
import {
  audienceEmptyKind,
  audienceSortAriaValue,
  nextAudienceSort,
  readAudienceSort,
  sortAudienceViewers,
  validateDisplayName,
  viewerPeriodMetrics,
  viewerPlatformsList,
  writeAudienceSort,
} from "./audience-helpers.js";
import { renderPlatformIcons } from "./platform-icon.js";

const VIEWERS_FETCH_TIMEOUT_MS = 15000;
const SEARCH_DEBOUNCE_MS = 250;
const WIDE_LAYOUT_QUERY = "(min-width: 1024px)";

let selectedViewerId = null;
let serverOrderedViewers = [];
let viewersCache = [];
let searchDebounceTimer = null;
let mergeInFlight = false;
let sessionInFlight = false;
let listLoadInFlight = null;
let detailLoadInFlight = null;
let audienceInitialized = false;
let listHasLoaded = false;
let listLoadError = false;
let currentPeriod = "session";
let focusReturnElement = null;
let pendingMerge = null;
let portraitUploadInFlight = false;
let wideLayoutQuery = null;
/** @type {import("./audience-helpers.js").AudienceSortState} */
let audienceSort = { column: null, direction: "desc" };

function audienceStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function refreshAudienceSortState() {
  audienceSort = readAudienceSort(audienceStorage());
}

function applyServerViewers(viewers) {
  serverOrderedViewers = Array.isArray(viewers) ? viewers : [];
  viewersCache = sortAudienceViewers(serverOrderedViewers, audienceSort, currentPeriod);
}

function updateSortHeader(buttonId, column) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }
  const header = button.closest("th");
  if (header) {
    header.setAttribute("aria-sort", audienceSortAriaValue(audienceSort, column));
  }
  if (audienceSort.column === column) {
    button.dataset.sortDirection = audienceSort.direction;
  } else {
    delete button.dataset.sortDirection;
  }
}

function updateSortHeaders() {
  updateSortHeader("audience-sort-viewer", "viewer");
  updateSortHeader("audience-sort-xp", "xp");
  updateSortHeader("audience-sort-messages", "messages");
}

function handleSortClick(column) {
  audienceSort = nextAudienceSort(audienceSort, column);
  writeAudienceSort(audienceStorage(), audienceSort);
  viewersCache = sortAudienceViewers(serverOrderedViewers, audienceSort, currentPeriod);
  renderViewersTable(viewersCache);
  updateSortHeaders();
}

function escapeText(value) {
  return String(value == null ? "" : value);
}

function portraitInitials(displayName) {
  return initialsForName(displayName || t("viewers.unnamed"));
}

function showPortraitInitials(host, initials, baseClass) {
  const fallback = document.createElement("span");
  fallback.className = baseClass + "__initials";
  fallback.setAttribute("aria-hidden", "true");
  fallback.textContent = initials;
  host.append(fallback);
}

function createPortraitElement(avatarURL, displayName, baseClass) {
  const host = document.createElement("span");
  host.className = baseClass;
  const initials = portraitInitials(displayName);
  const url = String(avatarURL || "").trim();

  if (url) {
    const img = document.createElement("img");
    img.className = baseClass + "__img";
    img.src = url;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", function () {
      img.remove();
      if (!host.querySelector("." + baseClass + "__initials")) {
        showPortraitInitials(host, initials, baseClass);
      }
    });
    host.append(img);
  } else {
    showPortraitInitials(host, initials, baseClass);
  }

  return host;
}

function mapViewerAvatarUploadError(serverMessage) {
  if (!serverMessage) {
    return t("viewers.portraitUploadFailed");
  }
  const normalized = String(serverMessage).toLowerCase();
  if (normalized === "file type is not allowed") {
    return t("viewers.portraitTypeNotAllowed");
  }
  if (normalized === "file is too large" || normalized === "file is too large or invalid") {
    return t("viewers.portraitTooLarge");
  }
  if (normalized === "viewer not found") {
    return t("viewers.portraitViewerMissing");
  }
  return serverMessage;
}

async function uploadViewerPortrait(viewerId, file) {
  const form = new FormData();
  form.append("id", viewerId);
  form.append("file", file);
  return fetchJSON("/api/viewers/avatar/upload", {
    method: "POST",
    body: form,
  });
}

async function clearViewerPortrait(viewerId) {
  return fetchJSON("/api/viewers/avatar/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: viewerId }),
  });
}

async function refreshViewerAfterPortraitChange(viewerId) {
  await loadViewersList(currentSearchQuery());
  if (selectedViewerId === viewerId) {
    await openViewerDetail(viewerId, focusReturnElement);
  }
}

function formatPlatformLabel(platform) {
  const key = "platform." + String(platform || "").toLowerCase();
  const translated = t(key);
  return translated === key ? escapeText(platform) : translated;
}

function isAudienceWorkspaceActive() {
  const section = document.getElementById("workspace-audience");
  return Boolean(section && !section.hidden);
}

function isAudienceVisible() {
  return isAudienceWorkspaceActive();
}

function currentSearchQuery() {
  return dom.viewersSearch ? dom.viewersSearch.value : "";
}

function isWideLayout() {
  if (!wideLayoutQuery) {
    wideLayoutQuery = window.matchMedia(WIDE_LAYOUT_QUERY);
  }
  return wideLayoutQuery.matches;
}

function syncPeriodFromSharedState() {
  currentPeriod = getLeaderboardPeriod();
  if (dom.audiencePeriod && dom.audiencePeriod.value !== currentPeriod) {
    dom.audiencePeriod.value = currentPeriod;
  }
}

function hideTableError() {
  if (dom.audienceTableError) {
    dom.audienceTableError.hidden = true;
  }
}

function showTableError(message) {
  if (!dom.audienceTableError) {
    return;
  }
  const body = dom.audienceTableError.querySelector(".notice__body");
  if (body) {
    body.textContent = message;
  }
  dom.audienceTableError.hidden = false;
  if (dom.audienceTableEmpty) {
    dom.audienceTableEmpty.hidden = true;
  }
  setRegionState(dom.audienceTableRegion, "error");
}

function updateEmptyState(viewers, query) {
  if (!dom.audienceTableEmpty || !dom.audienceTableEmptyMessage) {
    return;
  }

  const kind = audienceEmptyKind({
    loading: Boolean(listLoadInFlight) && !listHasLoaded,
    error: listLoadError,
    query: query,
    count: viewers.length,
  });

  if (kind === "ready") {
    dom.audienceTableEmpty.hidden = true;
    if (dom.audienceClearSearch) {
      dom.audienceClearSearch.hidden = true;
    }
    setRegionState(dom.audienceTableRegion, null);
    return;
  }

  if (kind === "loading") {
    dom.audienceTableEmpty.hidden = true;
    if (dom.audienceClearSearch) {
      dom.audienceClearSearch.hidden = true;
    }
    setRegionState(dom.audienceTableRegion, "loading");
    return;
  }

  if (kind === "error") {
    return;
  }

  dom.audienceTableEmpty.hidden = false;
  if (dom.audienceViewersTableBody) {
    dom.audienceViewersTableBody.textContent = "";
  }
  if (kind === "no-matches") {
    dom.audienceTableEmptyMessage.textContent = t("audience.noSearchMatches");
    if (dom.audienceClearSearch) {
      dom.audienceClearSearch.hidden = false;
    }
  } else {
    dom.audienceTableEmptyMessage.textContent = t("audience.noViewers");
    if (dom.audienceClearSearch) {
      dom.audienceClearSearch.hidden = true;
    }
  }
  setRegionState(dom.audienceTableRegion, "empty");
}

function updateTableSelection(id) {
  if (!dom.audienceViewersTableBody) {
    return;
  }
  dom.audienceViewersTableBody.querySelectorAll("tr[data-viewer-id]").forEach(function (row) {
    const viewerId = row.getAttribute("data-viewer-id") || "";
    const selected = viewerId === id;
    row.classList.toggle("audience-viewers-table__row--selected", selected);
    row.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function repairFocusReturnElement() {
  if (!selectedViewerId || !focusReturnElement || focusReturnElement.isConnected) {
    return;
  }
  const selectedRow = dom.audienceViewersTableBody
    ? Array.from(
      dom.audienceViewersTableBody.querySelectorAll("tr[data-viewer-id]")
    ).find(function (row) {
      return row.getAttribute("data-viewer-id") === selectedViewerId;
    })
    : null;
  if (!selectedRow) {
    focusReturnElement = null;
    return;
  }
  const returnToRow = focusReturnElement.matches("tr[data-viewer-id]");
  focusReturnElement = returnToRow
    ? selectedRow
    : selectedRow.querySelector(".audience-viewers-table__name-button") || selectedRow;
}

function renderViewersTable(viewers) {
  if (!dom.audienceViewersTableBody) {
    return;
  }

  viewersCache = viewers;
  dom.audienceViewersTableBody.textContent = "";
  updateEmptyState(viewers, currentSearchQuery());

  if (!viewers.length) {
    selectedViewerId = null;
    closeViewerDetail({ restoreFocus: false });
    return;
  }

  viewers.forEach(function (viewer) {
    const metrics = viewerPeriodMetrics(viewer, currentPeriod);
    const displayName = viewer.display_name || t("viewers.unnamed");

    const row = document.createElement("tr");
    row.setAttribute("data-viewer-id", viewer.id);
    row.tabIndex = -1;

    const nameCell = document.createElement("th");
    nameCell.scope = "row";
    nameCell.className = "audience-viewers-table__name";

    const nameInner = document.createElement("div");
    nameInner.className = "audience-viewers-table__name-inner";

    nameInner.append(
      createPortraitElement(
        viewer.avatar_url,
        displayName,
        "audience-viewers-table__portrait"
      )
    );

    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "audience-viewers-table__name-button";
    nameButton.textContent = displayName;
    nameButton.title = displayName;
    nameButton.addEventListener("click", function (event) {
      event.stopPropagation();
      openViewerDetail(viewer.id, nameButton).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });

    const chevron = document.createElement("span");
    chevron.className = "audience-viewers-table__chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";

    nameInner.append(nameButton, chevron);
    nameCell.append(nameInner);

    const platformCell = document.createElement("td");
    platformCell.className = "audience-viewers-table__platforms";
    const platformHost = document.createElement("div");
    renderPlatformIcons(
      platformHost,
      viewerPlatformsList(viewer),
      formatPlatformLabel,
      t("audience.platformsEmpty")
    );
    platformCell.append(platformHost);

    const scoreCell = document.createElement("td");
    scoreCell.className = "data-table__numeric";
    scoreCell.textContent = String(metrics.xp);

    const messagesCell = document.createElement("td");
    messagesCell.className = "data-table__numeric";
    messagesCell.textContent = String(metrics.messages);

    row.append(nameCell, platformCell, scoreCell, messagesCell);
    row.addEventListener("keydown", handleTableRowKeydown);
    row.addEventListener("click", function (event) {
      if (event.target.closest("button")) {
        return;
      }
      openViewerDetail(viewer.id, row).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
    dom.audienceViewersTableBody.append(row);
  });

  updateSortHeaders();

  updateTableSelection(selectedViewerId);
  repairFocusReturnElement();

  if (selectedViewerId && !viewers.some(function (viewer) {
    return viewer.id === selectedViewerId;
  })) {
    selectedViewerId = null;
    closeViewerDetail({ restoreFocus: false });
  }
}

function detailSurfaceElements() {
  if (isWideLayout()) {
    return {
      container: dom.audienceInspectorBody,
      loading: dom.audienceInspectorLoading,
      empty: dom.audienceInspectorEmpty,
      shell: dom.audienceInspector,
    };
  }
  return {
    container: dom.audienceSheetBody,
    loading: dom.audienceSheetLoading,
    shell: dom.audienceDetailSheet,
  };
}

function setDetailLoading(loading) {
  const surface = detailSurfaceElements();
  if (surface.loading) {
    surface.loading.hidden = !loading;
  }
  if (surface.container) {
    surface.container.hidden = loading;
  }
  if (surface.empty) {
    surface.empty.hidden = true;
  }
}

function syncInspectorVisibility() {
  if (!dom.audienceInspector) {
    return;
  }
  if (!isAudienceVisible()) {
    dom.audienceInspector.hidden = true;
    return;
  }
  if (isWideLayout()) {
    dom.audienceInspector.hidden = !selectedViewerId;
  } else {
    dom.audienceInspector.hidden = true;
  }
}

function hideViewerDetailShell() {
  if (dom.audienceDetailSheet) {
    dom.audienceDetailSheet.close();
  }
  if (dom.audienceInspector) {
    dom.audienceInspector.hidden = true;
  }
}

function enforceViewerDetailShellWhenHidden() {
  if (isAudienceWorkspaceActive()) {
    return;
  }
  hideViewerDetailShell();
}

function syncViewerDetailLayout() {
  syncInspectorVisibility();
  if (!isAudienceVisible()) {
    hideViewerDetailShell();
    return;
  }
  if (selectedViewerId) {
    openViewerDetail(selectedViewerId, focusReturnElement).catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
    return;
  }
  closeViewerDetail({ restoreFocus: false });
}

function clearDetailContainer() {
  const surface = detailSurfaceElements();
  if (surface.container) {
    surface.container.textContent = "";
    surface.container.hidden = true;
  }
  if (surface.empty) {
    surface.empty.hidden = false;
  }
  if (surface.shell && surface.shell === dom.audienceInspector) {
    dom.audienceInspector.hidden = true;
  }
}

function renderViewerDetail(viewer) {
  const surface = detailSurfaceElements();
  const container = surface.container;
  if (!container) {
    return;
  }

  container.textContent = "";
  container.hidden = false;
  if (surface.empty) {
    surface.empty.hidden = true;
  }
  if (surface.loading) {
    surface.loading.hidden = true;
  }

  const portraitSection = document.createElement("div");
  portraitSection.className = "audience-detail__portrait-section";

  const portrait = createPortraitElement(
    viewer.avatar_url,
    viewer.display_name || t("viewers.unnamed"),
    "audience-detail__portrait"
  );
  portraitSection.append(portrait);

  const portraitField = document.createElement("div");
  portraitField.className = "form__field audience-detail__portrait-field";
  const portraitLabel = document.createElement("label");
  const portraitInputId = "viewer-portrait-file";
  portraitLabel.setAttribute("for", portraitInputId);
  portraitLabel.textContent = t("viewers.portraitUpload");
  const portraitInput = document.createElement("input");
  portraitInput.id = portraitInputId;
  portraitInput.type = "file";
  portraitInput.accept = "image/png,image/jpeg,image/webp";
  portraitInput.className = "audience-detail__portrait-input";
  const portraitError = document.createElement("p");
  portraitError.className = "field-error";
  portraitError.id = "viewer-portrait-error";
  portraitError.setAttribute("role", "alert");
  portraitError.hidden = true;
  const portraitActions = document.createElement("div");
  portraitActions.className = "audience-detail__portrait-actions";

  if (viewer.custom_avatar) {
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "btn-physical btn-small";
    clearButton.textContent = t("viewers.portraitClear");
    clearButton.addEventListener("click", function () {
      if (portraitUploadInFlight) {
        return;
      }
      portraitUploadInFlight = true;
      portraitError.hidden = true;
      portraitInput.disabled = true;
      clearButton.disabled = true;
      clearViewerPortrait(viewer.id)
        .then(function () {
          return refreshViewerAfterPortraitChange(viewer.id);
        })
        .catch(function (err) {
          const message =
            err instanceof Error && err.message
              ? mapViewerAvatarUploadError(err.message)
              : t("viewers.portraitClearFailed");
          portraitError.textContent = message;
          portraitError.hidden = false;
        })
        .finally(function () {
          portraitUploadInFlight = false;
          portraitInput.disabled = false;
          clearButton.disabled = false;
        });
    });
    portraitActions.append(clearButton);
  }

  portraitInput.addEventListener("change", function () {
    const file = portraitInput.files && portraitInput.files[0];
    portraitInput.value = "";
    if (!file || portraitUploadInFlight) {
      return;
    }
    portraitUploadInFlight = true;
    portraitError.hidden = true;
    portraitInput.disabled = true;
    uploadViewerPortrait(viewer.id, file)
      .then(function () {
        return refreshViewerAfterPortraitChange(viewer.id);
      })
      .catch(function (err) {
        const message =
          err instanceof Error && err.message
            ? mapViewerAvatarUploadError(err.message)
            : t("viewers.portraitUploadFailed");
        portraitError.textContent = message;
        portraitError.hidden = false;
      })
      .finally(function () {
        portraitUploadInFlight = false;
        portraitInput.disabled = false;
      });
  });

  portraitField.append(portraitLabel, portraitInput, portraitError, portraitActions);
  portraitSection.append(portraitField);

  const title = document.createElement("h3");
  title.className = "audience-detail__title";
  title.textContent = viewer.display_name || t("viewers.unnamed");

  const stats = document.createElement("dl");
  stats.className = "audience-detail__stats";
  [
    ["viewers.periodSession", viewer.session_xp, viewer.session_message_count],
    ["viewers.periodDay", viewer.day_xp, viewer.day_message_count],
    ["viewers.periodAll", viewer.xp, viewer.message_count],
  ].forEach(function (row) {
    const dt = document.createElement("dt");
    dt.textContent = t(row[0]);
    const dd = document.createElement("dd");
    dd.textContent = t("viewers.statLine", {
      score: String(row[1] || 0),
      messages: String(row[2] || 0),
    });
    stats.append(dt, dd);
  });

  const nameField = document.createElement("div");
  nameField.className = "form__field audience-detail__name-field";
  const nameLabel = document.createElement("label");
  nameLabel.setAttribute("for", "viewer-display-name");
  nameLabel.textContent = t("viewers.displayName");
  const nameInput = document.createElement("input");
  nameInput.id = "viewer-display-name";
  nameInput.type = "text";
  nameInput.maxLength = 128;
  nameInput.value = viewer.display_name || "";
  const nameError = document.createElement("p");
  nameError.className = "field-error";
  nameError.id = "viewer-display-name-error";
  nameError.setAttribute("role", "alert");
  nameError.hidden = true;
  const saveNameButton = document.createElement("button");
  saveNameButton.type = "button";
  saveNameButton.className = "btn-physical btn-small";
  saveNameButton.textContent = t("viewers.saveName");
  saveNameButton.addEventListener("click", function () {
    const validationKey = validateDisplayName(nameInput.value);
    if (validationKey) {
      nameError.textContent = t(validationKey);
      nameError.hidden = false;
      nameInput.setAttribute("aria-invalid", "true");
      nameInput.setAttribute("aria-describedby", nameError.id);
      nameInput.focus();
      return;
    }
    nameError.hidden = true;
    nameInput.removeAttribute("aria-invalid");
    nameInput.removeAttribute("aria-describedby");
    saveNameButton.disabled = true;
    updateViewerDisplayName(viewer.id, nameInput.value)
      .catch(function (err) {
        const message = err instanceof Error && err.message ? err.message : t("banner.cannotReach");
        nameError.textContent = message;
        nameError.hidden = false;
        nameInput.setAttribute("aria-invalid", "true");
        nameInput.setAttribute("aria-describedby", nameError.id);
        nameInput.focus();
      })
      .finally(function () {
        saveNameButton.disabled = false;
      });
  });
  nameField.append(nameLabel, nameInput, nameError, saveNameButton);

  const hideField = document.createElement("div");
  hideField.className = "form__field audience-detail__hide-field";
  const hideLabel = document.createElement("label");
  const hideInputId = "viewer-leaderboard-hidden";
  hideLabel.setAttribute("for", hideInputId);
  const hideCheckbox = document.createElement("input");
  hideCheckbox.id = hideInputId;
  hideCheckbox.type = "checkbox";
  hideCheckbox.checked = Boolean(viewer.leaderboard_hidden);
  hideLabel.append(hideCheckbox, document.createTextNode(" " + t("viewers.leaderboardHide")));
  hideCheckbox.addEventListener("change", function () {
    const nextHidden = hideCheckbox.checked;
    hideCheckbox.disabled = true;
    updateViewerLeaderboardHidden(viewer.id, nextHidden)
      .catch(function () {
        hideCheckbox.checked = !nextHidden;
      })
      .finally(function () {
        hideCheckbox.disabled = false;
      });
  });
  hideField.append(hideLabel);

  const identitiesHeading = document.createElement("h4");
  identitiesHeading.className = "audience-detail__subheading";
  identitiesHeading.textContent = t("viewers.identities");

  const identities = document.createElement("ul");
  identities.className = "audience-detail__identities";
  (viewer.identities || []).forEach(function (identity) {
    const row = document.createElement("li");
    const identityName = identity.display_name || identity.username || identity.user_id;
    row.textContent = t("viewers.identityLine", {
      platform: formatPlatformLabel(identity.platform),
      name: identityName,
    });
    row.title = identityName;
    identities.append(row);
  });
  if (!viewer.identities || viewer.identities.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("viewers.noIdentities");
    identities.append(empty);
  }

  const mergeField = document.createElement("div");
  mergeField.className = "form__field audience-detail__merge";
  const mergeLabel = document.createElement("label");
  mergeLabel.setAttribute("for", "viewer-merge-target");
  mergeLabel.textContent = t("viewers.mergeInto");
  const mergeSelect = document.createElement("select");
  mergeSelect.id = "viewer-merge-target";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("viewers.mergeSelect");
  mergeSelect.append(placeholder);
  viewersCache.forEach(function (candidate) {
    if (candidate.id === viewer.id) {
      return;
    }
    const option = document.createElement("option");
    option.value = candidate.id;
    option.textContent = candidate.display_name || t("viewers.unnamed");
    mergeSelect.append(option);
  });
  const mergeButton = document.createElement("button");
  mergeButton.type = "button";
  mergeButton.className = "btn-physical btn-small";
  mergeButton.textContent = t("viewers.mergeConfirm");
  mergeButton.addEventListener("click", function () {
    if (!mergeSelect.value) {
      showBanner("error", t("viewers.mergePickTarget"));
      mergeSelect.focus();
      return;
    }
    promptMergeViewers(viewer, mergeSelect.value);
  });
  mergeField.append(mergeLabel, mergeSelect, mergeButton);

  container.append(portraitSection, title, stats, nameField, hideField, identitiesHeading, identities, mergeField);
}

function openDetailShell() {
  if (!isAudienceWorkspaceActive()) {
    hideViewerDetailShell();
    return;
  }
  if (isWideLayout()) {
    if (dom.audienceInspector) {
      dom.audienceInspector.hidden = false;
    }
    if (dom.audienceDetailSheet) {
      dom.audienceDetailSheet.close();
    }
    return;
  }
  if (dom.audienceInspector) {
    dom.audienceInspector.hidden = true;
  }
  if (dom.audienceDetailSheet && !dom.audienceDetailSheet.open) {
    dom.audienceDetailSheet.showModal();
  }
}

export function closeViewerDetail(options) {
  const restoreFocus = !options || options.restoreFocus !== false;
  if (dom.audienceDetailSheet && dom.audienceDetailSheet.open) {
    dom.audienceDetailSheet.close();
  }
  clearDetailContainer();
  if (restoreFocus && focusReturnElement && typeof focusReturnElement.focus === "function") {
    focusReturnElement.focus();
  }
  focusReturnElement = null;
}

async function openViewerDetail(id, trigger) {
  focusReturnElement = trigger || null;
  selectedViewerId = id;
  updateTableSelection(id);
  openDetailShell();
  setDetailLoading(true);

  if (detailLoadInFlight) {
    await detailLoadInFlight.catch(function () {
      /* superseded */
    });
  }

  detailLoadInFlight = fetchJSON("/api/viewers/get?id=" + encodeURIComponent(id))
    .then(function (payload) {
      if (!isAudienceWorkspaceActive() || selectedViewerId !== id) {
        return;
      }
      renderViewerDetail(payload);
      openDetailShell();
      const surface = detailSurfaceElements();
      if (surface.container) {
        surface.container.focus();
      }
    })
    .finally(function () {
      setDetailLoading(false);
      detailLoadInFlight = null;
    });

  return detailLoadInFlight;
}

export async function selectViewer(id) {
  return openViewerDetail(id, null);
}

function handleTableRowKeydown(event) {
  if (!dom.audienceViewersTableBody) {
    return;
  }
  const nameButton = event.target.closest(".audience-viewers-table__name-button");
  const rows = Array.from(dom.audienceViewersTableBody.querySelectorAll("tr[data-viewer-id]"));
  const currentIndex = rows.indexOf(event.currentTarget);
  if (currentIndex === -1) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const next = rows[currentIndex + 1];
    if (next) {
      const nextNameButton = next.querySelector(".audience-viewers-table__name-button");
      (nextNameButton || next).focus();
    }
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    const previous = rows[currentIndex - 1];
    if (previous) {
      const previousNameButton = previous.querySelector(".audience-viewers-table__name-button");
      (previousNameButton || previous).focus();
    }
  } else if ((event.key === "Enter" || event.key === " ") && !nameButton) {
    event.preventDefault();
    const viewerId = event.currentTarget.getAttribute("data-viewer-id");
    if (viewerId) {
      openViewerDetail(viewerId, event.currentTarget).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    }
  }
}

function handleAudienceTableKeydown(event) {
  if (!dom.audienceViewersTableBody || event.target !== dom.audienceViewersTableBody) {
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }
  const rows = dom.audienceViewersTableBody.querySelectorAll("tr[data-viewer-id]");
  if (rows.length === 0) {
    return;
  }
  event.preventDefault();
  rows[0].focus();
}

async function fetchJSON(path, options) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(function () {
    controller.abort();
  }, VIEWERS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(apiURL(path), Object.assign({}, options || {}, {
      signal: controller.signal,
    }));
    const payload = await readJSON(response);
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    return payload;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function loadViewersList(query) {
  const trimmed = String(query == null ? currentSearchQuery() : query).trim();
  const hadRows = viewersCache.length > 0;
  hideTableError();
  if (hadRows) {
    setRegionState(dom.audienceTableRegion, "stale");
  } else if (!listHasLoaded) {
    updateEmptyState([], trimmed);
  }

  if (listLoadInFlight) {
    return listLoadInFlight;
  }

  listLoadInFlight = fetchJSON("/api/viewers" + (trimmed ? "?q=" + encodeURIComponent(trimmed) : ""))
    .then(function (payload) {
      listLoadError = false;
      listHasLoaded = true;
      applyServerViewers((payload && payload.viewers) || []);
      renderViewersTable(viewersCache);
    })
    .catch(function (err) {
      listLoadError = true;
      const message = err instanceof Error && err.message ? err.message : t("audience.loadFailed");
      showTableError(message);
      if (hadRows) {
        setRegionState(dom.audienceTableRegion, "stale");
      }
    })
    .finally(function () {
      listLoadInFlight = null;
    });

  return listLoadInFlight;
}

async function updateViewerDisplayName(id, displayName) {
  await fetchJSON("/api/viewers/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id, display_name: String(displayName || "").trim() }),
  });
  showBanner("success", t("viewers.nameSaved"));
  await loadViewersList(currentSearchQuery());
  await openViewerDetail(id, focusReturnElement);
}

async function updateViewerLeaderboardHidden(id, hidden) {
  await fetchJSON("/api/viewers/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id, leaderboard_hidden: hidden }),
  });
  showBanner("success", t("viewers.leaderboardHideSaved"));
  await loadViewersList(currentSearchQuery());
  await openViewerDetail(id, focusReturnElement);
}

function promptMergeViewers(fromViewer, intoId) {
  const intoViewer = viewersCache.find(function (viewer) {
    return viewer.id === intoId;
  });
  if (!intoViewer || !dom.viewerMergePrompt) {
    return;
  }
  pendingMerge = {
    fromId: fromViewer.id,
    intoId: intoId,
    fromName: fromViewer.display_name || t("viewers.unnamed"),
    intoName: intoViewer.display_name || t("viewers.unnamed"),
  };
  if (dom.viewerMergePromptMessage) {
    dom.viewerMergePromptMessage.textContent = t("audience.mergeMessage", {
      from: pendingMerge.fromName,
      into: pendingMerge.intoName,
    });
  }
  dom.viewerMergePrompt.showModal();
}

function closeMergePrompt() {
  if (dom.viewerMergePrompt && dom.viewerMergePrompt.open) {
    dom.viewerMergePrompt.close();
  }
  pendingMerge = null;
}

export async function mergeViewers(fromId, intoId) {
  if (mergeInFlight) {
    return;
  }
  mergeInFlight = true;
  try {
    await fetchJSON("/api/viewers/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_id: fromId, into_id: intoId }),
    });
    selectedViewerId = intoId;
    showBanner("success", t("viewers.mergeDone"));
    await loadViewersList(currentSearchQuery());
    await openViewerDetail(intoId, focusReturnElement);
  } finally {
    mergeInFlight = false;
  }
}

export async function startNewStream() {
  if (sessionInFlight) {
    return;
  }
  sessionInFlight = true;
  try {
    await fetchJSON("/api/sessions/start", { method: "POST" });
    showBanner("success", t("stream.newStreamDone"));
    if (isAudienceVisible()) {
      await loadViewersList(currentSearchQuery());
      if (selectedViewerId) {
        await openViewerDetail(selectedViewerId, focusReturnElement);
      } else {
        closeViewerDetail({ restoreFocus: false });
      }
    }
  } finally {
    sessionInFlight = false;
  }
}

function rerenderTableForPeriod() {
  if (serverOrderedViewers.length > 0) {
    viewersCache = sortAudienceViewers(serverOrderedViewers, audienceSort, currentPeriod);
    renderViewersTable(viewersCache);
  }
}

function openLiveLeaderboard() {
  syncPeriodFromSharedState();
  if (window.location.hash !== "#live") {
    window.location.hash = "#live";
  }
  setLiveTab("leaderboard", { focusTab: true });
  setLeaderboardPeriod(currentPeriod, { reload: true }).catch(function () {
    /* handled in leaderboard region */
  });
}

function ensureAudienceLoaded() {
  if (!isAudienceVisible()) {
    return;
  }
  syncPeriodFromSharedState();
  if (!audienceInitialized) {
    audienceInitialized = true;
    loadViewersList(currentSearchQuery()).catch(function () {
      /* region handles error */
    });
  }
}

/** @param {import("./workspace-router.js").WorkspaceId} workspaceId */
export function handleAudienceWorkspaceChange(workspaceId) {
  if (workspaceId !== "audience") {
    hideViewerDetailShell();
    return;
  }
  ensureAudienceLoaded();
  syncViewerDetailLayout();
}

function openNewStreamPrompt() {
  if (!dom.newStreamPrompt) {
    return;
  }
  dom.newStreamPrompt.showModal();
}

function closeNewStreamPrompt() {
  if (dom.newStreamPrompt && dom.newStreamPrompt.open) {
    dom.newStreamPrompt.close();
  }
}

export function initAudienceViewers() {
  syncPeriodFromSharedState();
  refreshAudienceSortState();
  updateSortHeaders();

  const sortViewerButton = document.getElementById("audience-sort-viewer");
  if (sortViewerButton) {
    sortViewerButton.addEventListener("click", function () {
      handleSortClick("viewer");
    });
  }
  const sortXPButton = document.getElementById("audience-sort-xp");
  if (sortXPButton) {
    sortXPButton.addEventListener("click", function () {
      handleSortClick("xp");
    });
  }
  const sortMessagesButton = document.getElementById("audience-sort-messages");
  if (sortMessagesButton) {
    sortMessagesButton.addEventListener("click", function () {
      handleSortClick("messages");
    });
  }

  if (dom.refreshViewers) {
    dom.refreshViewers.addEventListener("click", function () {
      loadViewersList(currentSearchQuery()).catch(function () {
        /* region handles error */
      });
    });
  }

  if (dom.viewersSearch) {
    dom.viewersSearch.addEventListener("input", function () {
      if (searchDebounceTimer !== null) {
        window.clearTimeout(searchDebounceTimer);
      }
      searchDebounceTimer = window.setTimeout(function () {
        loadViewersList(dom.viewersSearch.value).catch(function () {
          /* region handles error */
        });
      }, SEARCH_DEBOUNCE_MS);
    });
  }

  if (dom.audienceClearSearch) {
    dom.audienceClearSearch.addEventListener("click", function () {
      if (dom.viewersSearch) {
        dom.viewersSearch.value = "";
        dom.viewersSearch.focus();
      }
      loadViewersList("").catch(function () {
        /* region handles error */
      });
    });
  }

  if (dom.audiencePeriod) {
    dom.audiencePeriod.addEventListener("change", function () {
      currentPeriod = dom.audiencePeriod.value || "session";
      setLeaderboardPeriod(currentPeriod);
      rerenderTableForPeriod();
    });
  }

  if (dom.audienceOpenLeaderboard) {
    dom.audienceOpenLeaderboard.addEventListener("click", openLiveLeaderboard);
  }

  if (dom.audienceInspectorClose) {
    dom.audienceInspectorClose.addEventListener("click", function () {
      closeViewerDetail();
    });
  }

  if (dom.audienceSheetClose) {
    dom.audienceSheetClose.addEventListener("click", function () {
      closeViewerDetail();
    });
  }

  if (dom.audienceDetailSheet) {
    dom.audienceDetailSheet.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeViewerDetail();
    });
  }

  if (dom.audienceViewersTableBody) {
    dom.audienceViewersTableBody.addEventListener("keydown", handleAudienceTableKeydown);
  }

  const tableRetry = dom.audienceTableError
    ? dom.audienceTableError.querySelector(".state-retry")
    : null;
  if (tableRetry) {
    tableRetry.addEventListener("click", function () {
      loadViewersList(currentSearchQuery()).catch(function () {
        /* region handles error */
      });
    });
  }

  if (dom.viewerMergePromptCancel) {
    dom.viewerMergePromptCancel.addEventListener("click", closeMergePrompt);
  }
  if (dom.viewerMergePromptConfirm) {
    dom.viewerMergePromptConfirm.addEventListener("click", function () {
      if (!pendingMerge) {
        closeMergePrompt();
        return;
      }
      const merge = pendingMerge;
      closeMergePrompt();
      mergeViewers(merge.fromId, merge.intoId).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
  }
  if (dom.viewerMergePrompt) {
    dom.viewerMergePrompt.addEventListener("cancel", closeMergePrompt);
  }

  window.addEventListener("hashchange", ensureAudienceLoaded);
  window.addEventListener("admin-locale-applied", function () {
    refreshAudienceSortState();
    if (serverOrderedViewers.length > 0) {
      viewersCache = sortAudienceViewers(serverOrderedViewers, audienceSort, currentPeriod);
      renderViewersTable(viewersCache);
    } else {
      updateSortHeaders();
    }
  });

  if (!wideLayoutQuery) {
    wideLayoutQuery = window.matchMedia(WIDE_LAYOUT_QUERY);
  }
  wideLayoutQuery.addEventListener("change", syncViewerDetailLayout);
  window.addEventListener("resize", enforceViewerDetailShellWhenHidden);

  syncInspectorVisibility();
  ensureAudienceLoaded();
}

export function initNewStreamControl() {
  [dom.newStreamButton, dom.audienceNewStreamButton].forEach(function (button) {
    if (!button) {
      return;
    }
    button.addEventListener("click", openNewStreamPrompt);
  });
  if (dom.newStreamPromptCancel) {
    dom.newStreamPromptCancel.addEventListener("click", closeNewStreamPrompt);
  }
  if (dom.newStreamPromptConfirm) {
    dom.newStreamPromptConfirm.addEventListener("click", function () {
      closeNewStreamPrompt();
      startNewStream().catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });
  }
  if (dom.newStreamPrompt) {
    dom.newStreamPrompt.addEventListener("cancel", function () {
      closeNewStreamPrompt();
    });
  }
}
