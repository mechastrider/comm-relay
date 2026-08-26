import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { showBanner } from "./ui-shell.js";
import { t } from "./i18n-ui.js";

export const CANVAS_SECTIONS = ["monitor", "viewers"];

const VIEWERS_FETCH_TIMEOUT_MS = 15000;

let selectedViewerId = null;
let viewersCache = [];
let searchDebounceTimer = null;
let mergeInFlight = false;
let sessionInFlight = false;
let listLoadInFlight = null;
let currentCanvasSection = "monitor";

function escapeText(value) {
  return String(value == null ? "" : value);
}

function formatPlatformLabel(platform) {
  const key = "platform." + String(platform || "").toLowerCase();
  const translated = t(key);
  return translated === key ? escapeText(platform) : translated;
}

function canvasHeadingKey(section) {
  return section === "viewers" ? "shell.viewersHeading" : "shell.liveMessages";
}

export function refreshCanvasHeading() {
  if (!dom.canvasHeading) {
    return;
  }
  dom.canvasHeading.textContent = t(canvasHeadingKey(currentCanvasSection));
  dom.canvasHeading.dataset.i18n = canvasHeadingKey(currentCanvasSection);
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
    if (dom.viewersCanvasPanel && !dom.viewersCanvasPanel.hidden) {
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

export function setCanvasSection(section, options) {
  const current = CANVAS_SECTIONS.indexOf(section) === -1 ? "monitor" : section;
  const previous = currentCanvasSection;
  currentCanvasSection = current;
  const tabs = [
    { id: "monitor", tab: dom.canvasMonitorTab, panel: dom.monitorCanvasPanel },
    { id: "viewers", tab: dom.canvasViewersTab, panel: dom.viewersCanvasPanel },
  ];

  tabs.forEach(function (item) {
    if (!item.tab || !item.panel) {
      return;
    }
    const selected = item.id === current;
    item.tab.setAttribute("aria-selected", selected ? "true" : "false");
    item.tab.tabIndex = selected ? 0 : -1;
    item.panel.hidden = !selected;
  });

  refreshCanvasHeading();

  if (dom.refreshMessages) {
    dom.refreshMessages.hidden = current !== "monitor";
  }
  if (dom.refreshViewers) {
    dom.refreshViewers.hidden = current !== "viewers";
  }

  if (current === "viewers" && previous !== "viewers") {
    loadViewersList(dom.viewersSearch ? dom.viewersSearch.value : "").catch(function () {
      showBanner("error", t("banner.cannotReach"));
    });
  }

  if (options && options.focusTab) {
    const focused = tabs.find(function (item) {
      return item.id === current;
    });
    if (focused && focused.tab) {
      focused.tab.focus();
    }
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

export function initCanvasTabs() {
  if (!dom.canvasMonitorTab || !dom.canvasViewersTab) {
    return;
  }

  setCanvasSection("monitor");

  [dom.canvasMonitorTab, dom.canvasViewersTab].forEach(function (tab) {
    tab.addEventListener("click", function () {
      setCanvasSection(tab.dataset.canvasSection, { focusTab: false });
    });
    tab.addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
        return;
      }
      event.preventDefault();
      const ids = CANVAS_SECTIONS.slice();
      const currentIndex = Math.max(0, ids.indexOf(tab.dataset.canvasSection));
      let nextIndex = currentIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = ids.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % ids.length;
      } else {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
      }
      setCanvasSection(ids[nextIndex], { focusTab: true });
    });
  });

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

  window.addEventListener("admin-locale-applied", function () {
    refreshCanvasHeading();
  });
}

export function initNewStreamControl() {
  if (dom.newStreamButton) {
    dom.newStreamButton.addEventListener("click", openNewStreamPrompt);
  }
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
