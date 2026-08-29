import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { showBanner } from "./ui-shell.js";
import { t } from "./i18n-ui.js";
import { parseWorkspaceHash } from "./workspace-router.js";

const VIEWERS_FETCH_TIMEOUT_MS = 15000;

let selectedViewerId = null;
let viewersCache = [];
let searchDebounceTimer = null;
let mergeInFlight = false;
let sessionInFlight = false;
let listLoadInFlight = null;
let audienceInitialized = false;

function escapeText(value) {
  return String(value == null ? "" : value);
}

function formatPlatformLabel(platform) {
  const key = "platform." + String(platform || "").toLowerCase();
  const translated = t(key);
  return translated === key ? escapeText(platform) : translated;
}

function isAudienceVisible() {
  return parseWorkspaceHash(window.location.hash) === "audience";
}

function updateListSelection(id) {
  if (!dom.viewersList) {
    return;
  }
  dom.viewersList.querySelectorAll(".viewers-list__item").forEach(function (button) {
    const viewerId = button.dataset.viewerId || "";
    const selected = viewerId === id;
    button.classList.toggle("viewers-list__item--selected", selected);
    if (selected) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function showViewerCardEmpty() {
  if (dom.viewerCard) {
    dom.viewerCard.hidden = true;
    dom.viewerCard.textContent = "";
  }
  if (dom.viewerCardEmpty) {
    dom.viewerCardEmpty.hidden = false;
  }
}

function renderViewersList(viewers) {
  if (!dom.viewersList || !dom.viewersListEmpty) {
    return;
  }

  dom.viewersList.textContent = "";
  viewersCache = viewers;

  if (!viewers.length) {
    dom.viewersListEmpty.hidden = false;
    selectedViewerId = null;
    showViewerCardEmpty();
    return;
  }

  dom.viewersListEmpty.hidden = true;

  viewers.forEach(function (viewer) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "viewers-list__item";
    button.dataset.viewerId = viewer.id;
    if (viewer.id === selectedViewerId) {
      button.classList.add("viewers-list__item--selected");
      button.setAttribute("aria-current", "true");
    }

    const name = document.createElement("span");
    name.className = "viewers-list__name";
    name.textContent = viewer.display_name || t("viewers.unnamed");

    const meta = document.createElement("span");
    meta.className = "viewers-list__meta";
    meta.textContent = t("viewers.listMeta", {
      score: String(viewer.session_score || 0),
      messages: String(viewer.session_message_count || 0),
    });

    button.append(name, meta);
    button.addEventListener("click", function () {
      selectViewer(viewer.id).catch(function () {
        showBanner("error", t("banner.cannotReach"));
      });
    });

    item.append(button);
    dom.viewersList.append(item);
  });

  if (selectedViewerId && !viewers.some(function (viewer) {
    return viewer.id === selectedViewerId;
  })) {
    selectedViewerId = null;
    showViewerCardEmpty();
  }
}

function renderViewerCard(viewer) {
  if (!dom.viewerCard || !dom.viewerCardEmpty) {
    return;
  }

  dom.viewerCard.textContent = "";
  dom.viewerCard.hidden = false;
  dom.viewerCardEmpty.hidden = true;

  const title = document.createElement("h4");
  title.className = "viewer-card__title";
  title.textContent = viewer.display_name || t("viewers.unnamed");

  const stats = document.createElement("dl");
  stats.className = "viewer-card__stats";
  [
    ["viewers.periodSession", viewer.session_score, viewer.session_message_count],
    ["viewers.periodDay", viewer.day_score, viewer.day_message_count],
    ["viewers.periodAll", viewer.score, viewer.message_count],
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
  nameField.className = "form__field viewer-card__name-field";
  const nameLabel = document.createElement("label");
  nameLabel.setAttribute("for", "viewer-display-name");
  nameLabel.textContent = t("viewers.displayName");
  const nameInput = document.createElement("input");
  nameInput.id = "viewer-display-name";
  nameInput.type = "text";
  nameInput.maxLength = 128;
  nameInput.value = viewer.display_name || "";
  const saveNameButton = document.createElement("button");
  saveNameButton.type = "button";
  saveNameButton.className = "btn-physical btn-small";
  saveNameButton.textContent = t("viewers.saveName");
  saveNameButton.addEventListener("click", function () {
    updateViewerDisplayName(viewer.id, nameInput.value).catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
  });
  nameField.append(nameLabel, nameInput, saveNameButton);

  const identitiesHeading = document.createElement("h5");
  identitiesHeading.className = "viewer-card__subheading";
  identitiesHeading.textContent = t("viewers.identities");

  const identities = document.createElement("ul");
  identities.className = "viewer-card__identities";
  (viewer.identities || []).forEach(function (identity) {
    const row = document.createElement("li");
    row.textContent = t("viewers.identityLine", {
      platform: formatPlatformLabel(identity.platform),
      name: identity.display_name || identity.username || identity.user_id,
    });
    identities.append(row);
  });
  if (!viewer.identities || viewer.identities.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("viewers.noIdentities");
    identities.append(empty);
  }

  const mergeField = document.createElement("div");
  mergeField.className = "form__field viewer-card__merge";
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
      return;
    }
    mergeViewers(viewer.id, mergeSelect.value).catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
  });
  mergeField.append(mergeLabel, mergeSelect, mergeButton);

  dom.viewerCard.append(title, stats, nameField, identitiesHeading, identities, mergeField);
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
  if (listLoadInFlight) {
    return listLoadInFlight;
  }

  const params = new URLSearchParams();
  const trimmed = String(query || "").trim();
  if (trimmed !== "") {
    params.set("q", trimmed);
  }
  const suffix = params.toString() ? "?" + params.toString() : "";

  listLoadInFlight = fetchJSON("/api/viewers" + suffix)
    .then(function (payload) {
      renderViewersList((payload && payload.viewers) || []);
    })
    .finally(function () {
      listLoadInFlight = null;
    });

  return listLoadInFlight;
}

export async function selectViewer(id) {
  selectedViewerId = id;
  updateListSelection(id);

  const payload = await fetchJSON("/api/viewers/get?id=" + encodeURIComponent(id));
  renderViewerCard(payload);
}

async function updateViewerDisplayName(id, displayName) {
  await fetchJSON("/api/viewers/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id, display_name: String(displayName || "").trim() }),
  });
  showBanner("success", t("viewers.nameSaved"));
  await loadViewersList(dom.viewersSearch ? dom.viewersSearch.value : "");
  await selectViewer(id);
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
    await loadViewersList(dom.viewersSearch ? dom.viewersSearch.value : "");
    await selectViewer(intoId);
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
      await loadViewersList(dom.viewersSearch ? dom.viewersSearch.value : "");
      if (selectedViewerId) {
        await selectViewer(selectedViewerId);
      } else {
        showViewerCardEmpty();
      }
    }
  } finally {
    sessionInFlight = false;
  }
}

function ensureAudienceLoaded() {
  if (!isAudienceVisible()) {
    return;
  }
  if (!audienceInitialized) {
    audienceInitialized = true;
    loadViewersList(dom.viewersSearch ? dom.viewersSearch.value : "").catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
  }
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
  if (dom.refreshViewers) {
    dom.refreshViewers.addEventListener("click", function () {
      loadViewersList(dom.viewersSearch ? dom.viewersSearch.value : "").catch(function () {
        showBanner("error", t("banner.cannotReach"));
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
          showBanner("error", t("banner.cannotReach"));
        });
      }, 250);
    });
  }

  window.addEventListener("hashchange", ensureAudienceLoaded);
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
