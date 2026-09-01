import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { setRegionState } from "./shell-state.js";
import { summarizeLiveStatistics } from "./live-helpers.js";
import { getLeaderboardPeriod } from "./live-leaderboard.js";
import { t } from "./i18n-ui.js";

let loadController = null;
let loadGeneration = 0;

function statisticsRegion() {
  return dom.liveStatisticsRegion;
}

function clearStatisticsList() {
  if (dom.liveStatisticsList) {
    dom.liveStatisticsList.textContent = "";
  }
}

function appendStatRow(labelKey, value) {
  if (!dom.liveStatisticsList) {
    return;
  }
  const row = document.createElement("div");
  row.className = "live-statistics__row";
  const dt = document.createElement("dt");
  dt.textContent = t(labelKey);
  const dd = document.createElement("dd");
  dd.textContent = value;
  row.append(dt, dd);
  dom.liveStatisticsList.append(row);
}

function showStatisticsError(message) {
  if (!dom.liveStatisticsError) {
    return;
  }
  const body = dom.liveStatisticsError.querySelector(".notice__body");
  if (body) {
    body.textContent = message;
  }
  dom.liveStatisticsError.hidden = false;
  if (dom.liveStatisticsEmpty) {
    dom.liveStatisticsEmpty.hidden = true;
  }
  if (dom.liveStatisticsPartial) {
    dom.liveStatisticsPartial.hidden = true;
  }
  clearStatisticsList();
  setRegionState(statisticsRegion(), "error");
}

function hideStatisticsError() {
  if (dom.liveStatisticsError) {
    dom.liveStatisticsError.hidden = true;
  }
}

function renderStatisticsSummary(summary) {
  clearStatisticsList();
  if (!summary.hasViewers) {
    if (dom.liveStatisticsEmpty) {
      dom.liveStatisticsEmpty.hidden = false;
    }
    if (dom.liveStatisticsPartial) {
      dom.liveStatisticsPartial.hidden = true;
    }
    setRegionState(statisticsRegion(), "empty");
    return;
  }

  if (dom.liveStatisticsEmpty) {
    dom.liveStatisticsEmpty.hidden = true;
  }
  if (dom.liveStatisticsPartial) {
    dom.liveStatisticsPartial.hidden = !summary.partialData;
  }

  const periodLabel = t("live.statsPeriod." + summary.period);
  appendStatRow("live.statsPeriodLabel", periodLabel);
  appendStatRow("live.statsUniqueViewers", String(summary.uniqueViewers));
  appendStatRow("live.statsTotalMessages", String(summary.totalMessages));
  appendStatRow("live.statsTotalScore", String(summary.totalScore));
  if (summary.topScorer) {
    const topLine = summary.tiedTopCount > 1
      ? t("live.statsTopScoreTied", {
        score: String(summary.topScore),
        count: String(summary.tiedTopCount),
      })
      : t("live.statsTopScore", {
        name: summary.topScorer,
        score: String(summary.topScore),
      });
    appendStatRow("live.statsTopScoreLabel", topLine);
  } else {
    appendStatRow("live.statsTopScoreLabel", t("live.statsNoTopScore"));
  }

  setRegionState(statisticsRegion(), null);
}

async function fetchJSON(path, signal) {
  const response = await fetch(apiURL(path), { signal: signal });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new Error(mapHTTPError(response.status, payload && payload.error));
  }
  return payload;
}

export async function loadLiveStatistics(options) {
  const opts = options || {};
  const period = opts.period || getLeaderboardPeriod();

  if (loadController) {
    loadController.abort();
  }
  loadController = new AbortController();
  const generation = ++loadGeneration;
  const signal = loadController.signal;

  hideStatisticsError();
  setRegionState(statisticsRegion(), "loading");
  if (dom.liveStatisticsEmpty) {
    dom.liveStatisticsEmpty.hidden = true;
  }
  if (dom.liveStatisticsPartial) {
    dom.liveStatisticsPartial.hidden = true;
  }

  try {
    const viewersPayload = await fetchJSON("/api/viewers", signal);
    if (generation !== loadGeneration) {
      return null;
    }

    let leaderboardPayload = null;
    let leaderboardFailed = false;
    try {
      leaderboardPayload = await fetchJSON(
        "/api/leaderboard?period=" + encodeURIComponent(period),
        signal
      );
    } catch {
      leaderboardFailed = true;
    }

    if (generation !== loadGeneration) {
      return null;
    }

    const summary = summarizeLiveStatistics(viewersPayload, leaderboardPayload, {
      period: period,
      leaderboardFailed: leaderboardFailed,
    });
    renderStatisticsSummary(summary);
    return summary;
  } catch (err) {
    if (err && err.name === "AbortError") {
      return null;
    }
    if (generation !== loadGeneration) {
      return null;
    }
    const message = err instanceof Error && err.message ? err.message : t("live.statisticsLoadFailed");
    showStatisticsError(message);
    return null;
  } finally {
    if (generation === loadGeneration) {
      loadController = null;
    }
  }
}

export function abortLiveStatistics() {
  if (loadController) {
    loadController.abort();
    loadController = null;
  }
}

export function initLiveStatistics() {
  if (dom.refreshStatistics) {
    dom.refreshStatistics.addEventListener("click", function () {
      loadLiveStatistics().catch(function () {
        /* handled inline */
      });
    });
  }

  const retryButton = dom.liveStatisticsError
    ? dom.liveStatisticsError.querySelector(".state-retry")
    : null;
  if (retryButton) {
    retryButton.addEventListener("click", function () {
      loadLiveStatistics().catch(function () {
        /* handled inline */
      });
    });
  }
}
