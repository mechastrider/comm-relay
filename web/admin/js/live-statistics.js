import * as dom from "./dom.js";
import { apiURL, readJSON, mapHTTPError } from "./api.js";
import { setRegionState } from "./shell-state.js";
import { summarizeLiveStatistics } from "./live-helpers.js";
import { getLeaderboardPeriod } from "./live-leaderboard.js";
import { t } from "./i18n-ui.js";
import { createStatisticsInvalidator } from "./live-data-helpers.js";

let loadController = null;
let loadGeneration = 0;
let hasRenderedStatistics = false;

const invalidator = createStatisticsInvalidator({
  refresh(revision) {
    loadLiveStatistics({ background: true, invalidationRevision: revision }).catch(function () {
      /* The region retains the existing retryable error state. */
    });
  },
});

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
    hasRenderedStatistics = true;
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
  hasRenderedStatistics = true;
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
  const invalidationRevision = typeof opts.invalidationRevision === "number"
    ? opts.invalidationRevision
    : invalidator.beginRefresh();

  if (loadController) {
    loadController.abort();
  }
  loadController = new AbortController();
  const generation = ++loadGeneration;
  const signal = loadController.signal;

  if (!opts.background && !hasRenderedStatistics) {
    hideStatisticsError();
    setRegionState(statisticsRegion(), "loading");
    if (dom.liveStatisticsEmpty) {
      dom.liveStatisticsEmpty.hidden = true;
    }
    if (dom.liveStatisticsPartial) {
      dom.liveStatisticsPartial.hidden = true;
    }
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
    invalidator.finishRefresh(invalidationRevision, true);
    return summary;
  } catch (err) {
    if (err && err.name === "AbortError") {
      invalidator.finishRefresh(invalidationRevision, false);
      return null;
    }
    if (generation !== loadGeneration) {
      invalidator.finishRefresh(invalidationRevision, false);
      return null;
    }
    const message = err instanceof Error && err.message ? err.message : t("live.statisticsLoadFailed");
    showStatisticsError(message);
    invalidator.finishRefresh(invalidationRevision, false);
    return null;
  } finally {
    if (generation === loadGeneration) {
      loadController = null;
    }
  }
}

export function abortLiveStatistics() {
  invalidator.cancel();
  if (loadController) {
    loadGeneration += 1;
    loadController.abort();
    loadController = null;
  }
}

/**
 * @param {{ active?: boolean }} [options]
 */
export function invalidateLiveStatistics(options) {
  const opts = options || {};
  invalidator.invalidate(Boolean(opts.active));
}

/**
 * Run HTTP recovery when Statistics becomes visible. Hidden invalidations stay
 * dirty until this call, and active opens still reconcile after a reconnect.
 */
export function openLiveStatistics() {
  invalidator.setActive(true);
  return loadLiveStatistics();
}

export function deactivateLiveStatistics() {
  invalidator.setActive(false);
  abortLiveStatistics();
}

function statisticsTabIsActive() {
  const workspace = document.getElementById("workspace-live");
  return Boolean(workspace && !workspace.hidden && dom.liveStatisticsPanel && !dom.liveStatisticsPanel.hidden);
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

  window.addEventListener("live-leaderboard-period-change", function () {
    abortLiveStatistics();
    invalidateLiveStatistics({ active: statisticsTabIsActive() });
  });
}
