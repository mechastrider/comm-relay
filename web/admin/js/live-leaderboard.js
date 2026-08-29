import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { setRegionState } from "./shell-state.js";
import { t } from "./i18n-ui.js";

export const LIVE_TABS = ["messages", "leaderboard", "statistics"];

let currentPeriod = "session";
let loadController = null;
let loadGeneration = 0;

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
  clearLeaderboardTable();
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
    scoreCell.textContent = String(typeof entry.score === "number" ? entry.score : 0);
    scoreCell.className = "data-table__numeric";
    const messagesCell = document.createElement("td");
    messagesCell.textContent = String(typeof entry.message_count === "number" ? entry.message_count : 0);
    messagesCell.className = "data-table__numeric";
    row.append(rankCell, nameCell, scoreCell, messagesCell);
    dom.liveLeaderboardTableBody.append(row);
  });
}

export function getLeaderboardPeriod() {
  return currentPeriod;
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
  const generation = ++loadGeneration;
  const signal = loadController.signal;

  hideLeaderboardError();
  setRegionState(leaderboardRegion(), "loading");
  if (dom.liveLeaderboardEmpty) {
    dom.liveLeaderboardEmpty.hidden = true;
  }

  try {
    const response = await fetch(
      apiURL("/api/leaderboard?period=" + encodeURIComponent(period)),
      { signal: signal }
    );
    const payload = await readJSON(response);
    if (generation !== loadGeneration) {
      return null;
    }
    if (!response.ok) {
      throw new Error(mapHTTPError(response.status, payload && payload.error));
    }
    const entries = (payload && payload.entries) || [];
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
    return payload;
  } catch (err) {
    if (err && err.name === "AbortError") {
      return null;
    }
    if (generation !== loadGeneration) {
      return null;
    }
    const message = err instanceof Error && err.message ? err.message : t("live.leaderboardLoadFailed");
    showLeaderboardError(message);
    return null;
  } finally {
    if (generation === loadGeneration) {
      loadController = null;
    }
  }
}

export function abortLiveLeaderboard() {
  if (loadController) {
    loadController.abort();
    loadController = null;
  }
}

export function initLiveLeaderboard(onPeriodChange) {
  if (dom.liveLeaderboardPeriod) {
    dom.liveLeaderboardPeriod.addEventListener("change", function () {
      currentPeriod = dom.liveLeaderboardPeriod.value || "session";
      loadLiveLeaderboard({ period: currentPeriod }).catch(function () {
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
