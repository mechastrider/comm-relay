import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { getLocale, t } from "./i18n-ui.js";
import {
  buildViewerFilterOptions,
  formatRewardHistoryTime,
  formatSignedPoints,
  RewardHistoryController,
  resolveViewerFilter,
  rewardHistoryURL,
  ViewerRewardHistorySession,
} from "./reward-history-core.js";

let globalHistory = null;
let globalHistoryMount = null;
let globalHistoryRefresh = null;
let viewerFilterElements = null;
let viewerFilterOptions = [];
let viewerFilterViewers = [];
let viewerFilterRequest = null;
let selectedViewerId = null;
let selectedViewerName = "";
const viewerHistorySession = new ViewerRewardHistorySession();

async function fetchRewardHistory(viewerId, limit, cursor, signal) {
  const response = await fetch(apiURL(rewardHistoryURL(viewerId, limit, cursor)), { signal: signal });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new Error(mapHTTPError(response.status, payload && payload.error));
  }
  return payload || {};
}

async function fetchViewerFilterViewers(signal) {
  const response = await fetch(apiURL("/api/viewers"), { signal: signal });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new Error(mapHTTPError(response.status, payload && payload.error));
  }
  return Array.isArray(payload && payload.viewers) ? payload.viewers : [];
}

function makeButton(label, action, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className || "btn-physical btn-small";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

export function makeHistoryTable(entries, options) {
  const table = document.createElement("table");
  table.className = options.compact ? "reward-history-table reward-history-table--compact" : "data-table reward-history-table";
  table.setAttribute("aria-label", t(options.compact ? "viewers.rewardHistoryTable" : "audience.historyTable"));
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = t(options.compact ? "viewers.rewardHistoryTable" : "audience.historyTable");
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  ["history.colTime", ...(options.compact ? [] : ["history.colViewer"]), "history.colReward", "history.colXP"].forEach(function (key) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = t(key);
    if (key === "history.colXP") {
      cell.className = "data-table__numeric";
    }
    row.append(cell);
  });
  head.append(row);
  const body = document.createElement("tbody");
  entries.forEach(function (entry) {
    const tr = document.createElement("tr");
    const time = document.createElement("td");
    time.className = "reward-history-table__time";
    time.textContent = formatRewardHistoryTime(entry.created_at, getLocale());
    tr.append(time);
    if (!options.compact) {
      const viewer = document.createElement("th");
      viewer.className = "reward-history-table__viewer";
      viewer.scope = "row";
      const viewerName = String(entry.viewer_display_name || t("viewers.unnamed"));
      if (entry.viewer_id && options.onViewerSelect) {
        const filter = makeButton(viewerName, function () {
          options.onViewerSelect(String(entry.viewer_id), viewerName);
        }, "reward-history-table__viewer-button");
        filter.setAttribute("aria-label", t("history.filterByViewer", { viewer: viewerName }));
        viewer.append(filter);
      } else {
        viewer.textContent = viewerName;
      }
      tr.append(viewer);
    }
    const reward = document.createElement("td");
    reward.className = "reward-history-table__reward";
    reward.textContent = String(entry.reward_name || entry.reward_id || "");
    const points = document.createElement("td");
    points.className = "data-table__numeric reward-history-table__points";
    points.textContent = formatSignedPoints(entry.points);
    tr.append(reward, points);
    body.append(tr);
  });
  table.append(caption, head, body);
  return table;
}

export function renderHistory(mount, state, options) {
  mount.textContent = "";
  mount.setAttribute("aria-busy", state.loading || state.loadingMore ? "true" : "false");
  const status = document.createElement("p");
  status.className = "reward-history__status visually-hidden";
  status.setAttribute("aria-live", "polite");
  if (state.loading) {
    status.textContent = t("history.loading");
  } else if (state.loadingMore) {
    status.textContent = t("history.loadingMore");
  } else if (state.entries.length > 0) {
    status.textContent = t("history.loadedCount", { count: String(state.entries.length) });
  }
  mount.append(status);

  if (state.loading && state.entries.length === 0) {
    const loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = t("history.loading");
    mount.append(loading);
    return;
  }

  if (state.entries.length > 0) {
    const scroll = document.createElement("div");
    scroll.className = "reward-history__table-scroll";
    scroll.append(makeHistoryTable(state.entries, options));
    mount.append(scroll);
  }

  if (state.error) {
    const error = document.createElement("div");
    error.className = "notice notice--error reward-history__error";
    const message = document.createElement("p");
    message.className = "notice__body";
    message.textContent = t("history.loadFailed");
    error.append(message, makeButton(t("state.retry"), function () {
      if (state.errorRequest === "more") {
        options.controller.loadMore();
      } else {
        options.controller.loadFirst();
      }
    }));
    mount.append(error);
  } else if (state.hasLoaded && state.entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t(options.compact ? "viewers.rewardHistoryEmpty" : "audience.historyEmpty");
    mount.append(empty);
  }

  if (state.entries.length > 0 && state.nextCursor) {
    const footer = document.createElement("div");
    footer.className = "reward-history__footer";
    const more = makeButton(t("history.loadMore"), function () {
      options.controller.loadMore();
    });
    more.disabled = state.loading || state.loadingMore;
    more.setAttribute("aria-busy", state.loadingMore ? "true" : "false");
    footer.append(more);
    mount.append(footer);
  }
}

function createController(mount, viewerId, limit, compact, afterChange, onViewerSelect) {
  let controller;
  controller = new RewardHistoryController({
    fetchPage: function (cursor, signal) {
      return fetchRewardHistory(viewerId, limit, cursor, signal);
    },
    onChange: function (state) {
      renderHistory(mount, state, {
        controller: controller,
        compact: compact,
        onViewerSelect: onViewerSelect,
      });
      if (afterChange) {
        afterChange(state);
      }
    },
  });
  return controller;
}

function platformFilterLabel(platform) {
  const key = "platform." + platform;
  const label = t(key);
  return label === key ? platform : label;
}

function selectedViewerOption(fallbackName) {
  return viewerFilterOptions.find(function (option) {
    return option.id === selectedViewerId;
  }) || (selectedViewerId ? {
    id: selectedViewerId,
    displayName: fallbackName || selectedViewerName || selectedViewerId,
    label: fallbackName || selectedViewerName || selectedViewerId,
  } : null);
}

function showViewerFilterError(message) {
  if (!viewerFilterElements) {
    return;
  }
  viewerFilterElements.error.textContent = message || "";
  viewerFilterElements.error.hidden = !message;
  viewerFilterElements.input.setAttribute("aria-invalid", message ? "true" : "false");
}

function renderViewerFilterSelection(fallbackName) {
  if (!viewerFilterElements) {
    return;
  }
  const selected = selectedViewerOption(fallbackName);
  selectedViewerName = selected ? selected.displayName : "";
  viewerFilterElements.input.value = selected ? selected.label : "";
  viewerFilterElements.clear.disabled = !selectedViewerId;
  viewerFilterElements.status.hidden = !selected;
  viewerFilterElements.status.textContent = selected
    ? t("history.viewerFilterActive", { viewer: selected.displayName })
    : "";
  showViewerFilterError("");
}

function renderViewerFilterOptions() {
  if (!viewerFilterElements) {
    return;
  }
  viewerFilterOptions = buildViewerFilterOptions(viewerFilterViewers, platformFilterLabel);
  viewerFilterElements.options.textContent = "";
  viewerFilterOptions.forEach(function (choice) {
    const option = document.createElement("option");
    option.value = choice.label;
    viewerFilterElements.options.append(option);
  });
  renderViewerFilterSelection();
}

async function loadViewerFilterOptions() {
  if (!viewerFilterElements) {
    return;
  }
  if (viewerFilterRequest) {
    viewerFilterRequest.abort();
  }
  const request = new AbortController();
  viewerFilterRequest = request;
  viewerFilterElements.input.disabled = true;
  viewerFilterElements.apply.disabled = true;
  try {
    viewerFilterViewers = await fetchViewerFilterViewers(request.signal);
    if (!request.signal.aborted) {
      renderViewerFilterOptions();
    }
  } catch {
    if (!request.signal.aborted) {
      showViewerFilterError(t("history.viewerFilterLoadFailed"));
    }
  } finally {
    if (viewerFilterRequest === request) {
      viewerFilterRequest = null;
      viewerFilterElements.input.disabled = false;
      viewerFilterElements.apply.disabled = false;
    }
  }
}

function createGlobalHistory(viewerId) {
  return createController(globalHistoryMount, viewerId, 50, false, function (state) {
    globalHistoryRefresh.disabled = state.loading || state.loadingMore;
    globalHistoryRefresh.setAttribute("aria-busy", state.loading ? "true" : "false");
  }, function (nextViewerId, viewerName) {
    setGlobalViewerFilter(nextViewerId, viewerName);
  });
}

function setGlobalViewerFilter(viewerId, fallbackName) {
  const nextViewerId = viewerId ? String(viewerId) : null;
  if (!globalHistoryMount || !globalHistoryRefresh) {
    return Promise.resolve();
  }
  if (globalHistory && selectedViewerId === nextViewerId) {
    selectedViewerName = fallbackName || selectedViewerName;
    renderViewerFilterSelection(fallbackName);
    return Promise.resolve();
  }
  if (globalHistory) {
    globalHistory.cancel();
  }
  selectedViewerId = nextViewerId;
  selectedViewerName = nextViewerId ? String(fallbackName || selectedViewerName || nextViewerId) : "";
  renderViewerFilterSelection(fallbackName);
  globalHistory = createGlobalHistory(nextViewerId);
  return globalHistory.loadFirst();
}

function applyViewerFilterInput() {
  if (!viewerFilterElements) {
    return;
  }
  const value = viewerFilterElements.input.value.trim();
  if (!value) {
    setGlobalViewerFilter(null);
    return;
  }
  const selected = resolveViewerFilter(viewerFilterOptions, value);
  if (!selected) {
    showViewerFilterError(t("history.viewerFilterInvalid"));
    return;
  }
  setGlobalViewerFilter(selected.id, selected.displayName);
}

export function initRewardHistory() {
  const mount = document.getElementById("audience-history-content");
  const refresh = document.getElementById("refresh-reward-history");
  const form = document.getElementById("reward-history-viewer-filter-form");
  const input = document.getElementById("reward-history-viewer-filter");
  const options = document.getElementById("reward-history-viewer-options");
  const apply = document.getElementById("apply-reward-history-viewer-filter");
  const clear = document.getElementById("clear-reward-history-viewer-filter");
  const status = document.getElementById("reward-history-viewer-filter-status");
  const error = document.getElementById("reward-history-viewer-filter-error");
  if (!mount || !refresh || !form || !input || !options || !apply || !clear || !status || !error) {
    return;
  }
  globalHistoryMount = mount;
  globalHistoryRefresh = refresh;
  viewerFilterElements = {
    form: form,
    input: input,
    options: options,
    apply: apply,
    clear: clear,
    status: status,
    error: error,
  };
  globalHistory = createGlobalHistory(null);
  refresh.addEventListener("click", function () {
    globalHistory.loadFirst();
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    applyViewerFilterInput();
  });
  input.addEventListener("input", function () {
    showViewerFilterError("");
  });
  input.addEventListener("change", function () {
    const selected = resolveViewerFilter(viewerFilterOptions, input.value);
    if (selected) {
      setGlobalViewerFilter(selected.id, selected.displayName);
    } else if (!input.value.trim()) {
      setGlobalViewerFilter(null);
    }
  });
  clear.addEventListener("click", function () {
    setGlobalViewerFilter(null);
    input.focus();
  });
}

export function ensureRewardHistoryLoaded() {
  if (globalHistory) {
    return Promise.all([globalHistory.loadFirst(), loadViewerFilterOptions()]);
  }
  return Promise.resolve();
}

export function createViewerRewardHistory(viewerId) {
  cancelViewerRewardHistory();
  const section = document.createElement("section");
  section.className = "audience-detail__reward-history reward-history";
  section.setAttribute("aria-labelledby", "viewer-reward-history-heading");
  const heading = document.createElement("h4");
  heading.id = "viewer-reward-history-heading";
  heading.className = "audience-detail__subheading";
  heading.textContent = t("viewers.rewardHistoryHeading");
  const mount = document.createElement("div");
  mount.className = "reward-history__content";
  section.append(heading, mount);
  viewerHistorySession.begin(viewerId, createController(mount, viewerId, 5, true));
  return section;
}

export function cancelViewerRewardHistory() {
  viewerHistorySession.cancel();
}

export function refreshRewardHistoryLocale() {
  renderViewerFilterOptions();
  if (globalHistory) {
    globalHistory.publish();
  }
  if (viewerHistorySession.controller) {
    viewerHistorySession.controller.publish();
  }
}

export { formatRewardHistoryTime, formatSignedPoints, rewardHistoryURL };
