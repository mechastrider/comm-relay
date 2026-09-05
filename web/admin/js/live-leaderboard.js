import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { setRegionState } from "./shell-state.js";
import { t } from "./i18n-ui.js";
import {
  createLeaderboardLoadSequencer,
  createLeaderboardSnapshotCache,
  leaderboardPeriodTransition,
} from "./live-data-helpers.js";

export const LIVE_TABS = ["messages", "leaderboard", "statistics"];

let currentPeriod = "session";
let loadController = null;
let renderedPeriod = null;
const snapshots = createLeaderboardSnapshotCache();
const loadSequencer = createLeaderboardLoadSequencer();

function leaderboardRegion() {
  return dom.liveLeaderboardRegion;
}

function clearLeaderboardTable() {
  if (dom.liveLeaderboardTableBody) {
    dom.liveLeaderboardTableBody.textContent = "";
  }
}

function showLeaderboardError(message) {
  if (!dom.liveLeaderboardError) {
    return;
  }
  const body = dom.liveLeaderboardError.querySelector(".notice__body");
  if (body) {
    body.textContent = message;
  }
  dom.liveLeaderboardError.hidden = false;
  if (dom.liveLeaderboardEmpty) {
    dom.liveLeaderboardEmpty.hidden = true;
  }
  setRegionState(leaderboardRegion(), "error");
}

function hideLeaderboardError() {
  if (dom.liveLeaderboardError) {
    dom.liveLeaderboardError.hidden = true;
  }
}

function renderLeaderboardRows(entries) {
  if (!dom.liveLeaderboardTableBody) {
    return;
  }
  dom.liveLeaderboardTableBody.textContent = "";
  entries.forEach(function (entry) {
    const row = document.createElement("tr");
    const rankCell = document.createElement("td");
    rankCell.textContent = String(entry.rank || "");
    rankCell.className = "data-table__rank";
    const nameCell = document.createElement("td");
    nameCell.textContent = entry.display_name || t("viewers.unnamed");
    const scoreCell = document.createElement("td");
    scoreCell.textContent = String(typeof entry.xp === "number" ? entry.xp : 0);
    scoreCell.className = "data-table__numeric";
    const messagesCell = document.createElement("td");
    messagesCell.textContent = String(typeof entry.message_count === "number" ? entry.message_count : 0);
    messagesCell.className = "data-table__numeric";
    row.append(rankCell, nameCell, scoreCell, messagesCell);
    dom.liveLeaderboardTableBody.append(row);
  });
}

/**
 * @param {{ period?: string, entries?: Array<Record<string, unknown>> }} payload
 */
function renderLeaderboardPayload(payload) {
  const entries = Array.isArray(payload && payload.entries) ? payload.entries : [];
  hideLeaderboardError();
  if (entries.length === 0) {
    clearLeaderboardTable();
    if (dom.liveLeaderboardEmpty) {
      dom.liveLeaderboardEmpty.hidden = false;
    }
    setRegionState(leaderboardRegion(), "empty");
  } else {
    renderLeaderboardRows(entries);
    if (dom.liveLeaderboardEmpty) {
      dom.liveLeaderboardEmpty.hidden = true;
    }
    setRegionState(leaderboardRegion(), null);
  }
  renderedPeriod = payload && payload.period ? payload.period : currentPeriod;
}

export function getLeaderboardPeriod() {
  return currentPeriod;
}

/**
 * @param {"session"|"day"|"all"} period
 * @param {{ reload?: boolean }} [options]
 */
export function setLeaderboardPeriod(period, options) {
  const next = period === "day" || period === "all" ? period : "session";
  currentPeriod = next;
  if (dom.liveLeaderboardPeriod && dom.liveLeaderboardPeriod.value !== next) {
    dom.liveLeaderboardPeriod.value = next;
  }
  if (dom.audiencePeriod && dom.audiencePeriod.value !== next) {
    dom.audiencePeriod.value = next;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("live-leaderboard-period-change", {
      detail: { period: next },
    }));
  }
  if (options && options.reload) {
    return loadLiveLeaderboard({ period: next });
  }
  return Promise.resolve(null);
}

export async function loadLiveLeaderboard(options) {
  const opts = options || {};
  const period = opts.period || currentPeriod;
  currentPeriod = period;
  if (dom.liveLeaderboardPeriod && dom.liveLeaderboardPeriod.value !== period) {
    dom.liveLeaderboardPeriod.value = period;
  }

  if (loadController) {
    loadController.abort();
  }
  loadController = new AbortController();
  const generation = loadSequencer.begin(period);
  const signal = loadController.signal;

  const cached = snapshots.get(period);
  const transition = leaderboardPeriodTransition(renderedPeriod, period, Boolean(cached && opts.useCache !== false));
  if (cached && opts.useCache !== false) {
    renderLeaderboardPayload(cached);
  } else if (transition.showLoading) {
    clearLeaderboardTable();
    renderedPeriod = null;
    hideLeaderboardError();
    setRegionState(leaderboardRegion(), "loading");
    if (dom.liveLeaderboardEmpty) {
      dom.liveLeaderboardEmpty.hidden = true;
    }
  }

  try {
    const response = await fetch(
      apiURL("/api/leaderboard?period=" + encodeURIComponent(period)),
      { signal: signal }
    );
    const payload = await readJSON(response);
    if (!loadSequencer.acceptsResponse(generation, period)) {
      return null;
    }
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    const snapshot = snapshots.remember(payload);
    if (snapshot && snapshot.period === currentPeriod) {
      renderLeaderboardPayload(snapshot);
    }
    return payload;
  } catch (err) {
    if (err && err.name === "AbortError") {
      return null;
    }
    if (!loadSequencer.acceptsResponse(generation, period)) {
      return null;
    }
    const message = err instanceof Error && err.message ? err.message : t("live.leaderboardLoadFailed");
    if (!transition.preserveRowsOnError) {
      clearLeaderboardTable();
      renderedPeriod = null;
    }
    showLeaderboardError(message);
    return null;
  } finally {
    if (loadSequencer.finish(generation)) {
      loadController = null;
    }
  }
}

/**
 * Cache every valid leaderboard frame. Rendering is intentionally left to the
 * active Live tab so a hidden workspace does not churn its DOM.
 *
 * @param {unknown} frame
 * @returns {boolean}
 */
export function cacheLiveLeaderboardFrame(frame) {
  const snapshot = snapshots.remember(frame);
  if (!snapshot) {
    return false;
  }
  if (snapshot.period === currentPeriod && loadSequencer.invalidateForSnapshot(snapshot.period)) {
    if (loadController) {
      loadController.abort();
      loadController = null;
    }
  }
  return true;
}

/**
 * @param {unknown} frame
 * @returns {boolean}
 */
export function applyLiveLeaderboardFrame(frame) {
  if (!cacheLiveLeaderboardFrame(frame)) {
    return false;
  }
  const snapshot = snapshots.get(frame && frame.period);
  if (!snapshot || snapshot.period !== currentPeriod) {
    return false;
  }
  renderLeaderboardPayload(snapshot);
  return true;
}

export function renderCachedLiveLeaderboard() {
  const snapshot = snapshots.get(currentPeriod);
  if (!snapshot) {
    return false;
  }
  renderLeaderboardPayload(snapshot);
  return true;
}

export function abortLiveLeaderboard() {
  if (loadController) {
    loadSequencer.cancel();
    loadController.abort();
    loadController = null;
  }
}

export function initLiveLeaderboard(onPeriodChange) {
  if (dom.liveLeaderboardPeriod) {
    dom.liveLeaderboardPeriod.addEventListener("change", function () {
      setLeaderboardPeriod(dom.liveLeaderboardPeriod.value || "session", { reload: true }).catch(function () {
        /* handled inline */
      });
      if (typeof onPeriodChange === "function") {
        onPeriodChange(currentPeriod);
      }
    });
  }

  if (dom.refreshLeaderboard) {
    dom.refreshLeaderboard.addEventListener("click", function () {
      loadLiveLeaderboard().catch(function () {
        /* handled inline */
      });
    });
  }

  const retryButton = dom.liveLeaderboardError
    ? dom.liveLeaderboardError.querySelector(".state-retry")
    : null;
  if (retryButton) {
    retryButton.addEventListener("click", function () {
      loadLiveLeaderboard().catch(function () {
        /* handled inline */
      });
    });
  }
}
