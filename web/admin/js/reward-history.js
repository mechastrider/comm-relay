import { apiURL, mapHTTPError, readJSON } from "./api.js";
import { getLocale, t } from "./i18n-ui.js";
import {
  formatRewardHistoryTime,
  formatSignedPoints,
  RewardHistoryController,
  rewardHistoryURL,
  ViewerRewardHistorySession,
} from "./reward-history-core.js";

let globalHistory = null;
const viewerHistorySession = new ViewerRewardHistorySession();

async function fetchRewardHistory(viewerId, limit, cursor, signal) {
  const response = await fetch(apiURL(rewardHistoryURL(viewerId, limit, cursor)), { signal: signal });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new Error(mapHTTPError(response.status, payload && payload.error));
  }
  return payload || {};
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
      viewer.textContent = String(entry.viewer_display_name || t("viewers.unnamed"));
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

function createController(mount, viewerId, limit, compact, afterChange) {
  let controller;
  controller = new RewardHistoryController({
    fetchPage: function (cursor, signal) {
      return fetchRewardHistory(viewerId, limit, cursor, signal);
    },
    onChange: function (state) {
      renderHistory(mount, state, { controller: controller, compact: compact });
      if (afterChange) {
        afterChange(state);
      }
    },
  });
  return controller;
}

export function initRewardHistory() {
  const mount = document.getElementById("audience-history-content");
  const refresh = document.getElementById("refresh-reward-history");
  if (!mount || !refresh) {
    return;
  }
  globalHistory = createController(mount, null, 50, false, function (state) {
    refresh.disabled = state.loading || state.loadingMore;
    refresh.setAttribute("aria-busy", state.loading ? "true" : "false");
  });
  refresh.addEventListener("click", function () {
    globalHistory.loadFirst();
  });
}

export function ensureRewardHistoryLoaded() {
  if (globalHistory) {
    return globalHistory.loadFirst();
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
  if (globalHistory) {
    globalHistory.publish();
  }
  if (viewerHistorySession.controller) {
    viewerHistorySession.controller.publish();
  }
}

export { formatRewardHistoryTime, formatSignedPoints, rewardHistoryURL };
