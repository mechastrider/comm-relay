/**
 * Pure helpers for Live workspace (active preset rollback, statistics aggregates).
 */

/**
 * @param {string} presetId
 * @returns {{ preset_id: string }}
 */
export function buildActivatePresetBody(presetId) {
  return { preset_id: String(presetId || "") };
}

/**
 * @param {string} previousId
 * @param {string} requestedId
 * @param {boolean} ok
 * @returns {{ activeId: string, selectedId: string, requestedId: string, previousId: string, ok: boolean }}
 */
export function nextActivePresetSelection(previousId, requestedId, ok) {
  const prev = String(previousId || "");
  const requested = String(requestedId || "");
  return {
    activeId: ok ? requested : prev,
    selectedId: ok ? requested : prev,
    requestedId: requested,
    previousId: prev,
    ok: Boolean(ok),
  };
}

/**
 * @typedef {object} ViewerRow
 * @property {string} [id]
 * @property {string} [display_name]
 * @property {number} [message_count]
 * @property {number} [score]
 * @property {number} [session_message_count]
 * @property {number} [session_score]
 * @property {number} [day_message_count]
 * @property {number} [day_score]
 */

/**
 * @param {ViewerRow} viewer
 * @param {string} period
 * @returns {boolean}
 */
function viewerHasPeriodActivity(viewer, period) {
  if (period === "day") {
    return typeof viewer.day_message_count === "number" && viewer.day_message_count > 0;
  }
  if (period === "all") {
    return typeof viewer.message_count === "number" && viewer.message_count > 0;
  }
  return typeof viewer.session_message_count === "number" && viewer.session_message_count > 0;
}

/**
 * @typedef {object} LeaderboardEntry
 * @property {number} [rank]
 * @property {string} [display_name]
 * @property {number} [score]
 * @property {number} [message_count]
 */

/**
 * @param {{ viewers?: ViewerRow[] } | null | undefined} viewersPayload
 * @param {{ period?: string, entries?: LeaderboardEntry[] } | null | undefined} leaderboardPayload
 * @param {{ leaderboardFailed?: boolean, period?: string }} [options]
 */
export function summarizeLiveStatistics(viewersPayload, leaderboardPayload, options) {
  const opts = options || {};
  const period = opts.period || (leaderboardPayload && leaderboardPayload.period) || "session";
  const viewers = (viewersPayload && viewersPayload.viewers) || [];
  const entries = (leaderboardPayload && leaderboardPayload.entries) || [];
  const leaderboardFailed = Boolean(opts.leaderboardFailed);

  const uniqueViewers = viewers.filter(function (viewer) {
    return viewerHasPeriodActivity(viewer, period);
  }).length;
  let totalMessages = 0;
  let totalScore = 0;
  let hasDayFields = false;

  viewers.forEach(function (viewer) {
    if (period === "day") {
      if (typeof viewer.day_message_count === "number") {
        totalMessages += viewer.day_message_count;
      }
      if (typeof viewer.day_score === "number") {
        totalScore += viewer.day_score;
        hasDayFields = true;
      }
    } else if (period === "all") {
      totalMessages += typeof viewer.message_count === "number" ? viewer.message_count : 0;
      totalScore += typeof viewer.score === "number" ? viewer.score : 0;
    } else {
      totalMessages += typeof viewer.session_message_count === "number" ? viewer.session_message_count : 0;
      totalScore += typeof viewer.session_score === "number" ? viewer.session_score : 0;
    }
    if (typeof viewer.day_score === "number" || typeof viewer.day_message_count === "number") {
      hasDayFields = true;
    }
  });

  let topScore = 0;
  let topScorer = "";
  let tiedTopCount = 0;

  if (!leaderboardFailed && entries.length > 0) {
    topScore = typeof entries[0].score === "number" ? entries[0].score : 0;
    topScorer = entries[0].display_name || "";
    tiedTopCount = entries.filter(function (entry) {
      return (typeof entry.score === "number" ? entry.score : 0) === topScore;
    }).length;
  } else if (viewers.length > 0) {
    const scoreKey = period === "day"
      ? "day_score"
      : period === "all"
        ? "score"
        : "session_score";
    const sorted = viewers.slice().sort(function (a, b) {
      const aScore = typeof a[scoreKey] === "number" ? a[scoreKey] : 0;
      const bScore = typeof b[scoreKey] === "number" ? b[scoreKey] : 0;
      return bScore - aScore;
    });
    topScore = typeof sorted[0][scoreKey] === "number" ? sorted[0][scoreKey] : 0;
    topScorer = sorted[0].display_name || "";
    tiedTopCount = sorted.filter(function (viewer) {
      return (typeof viewer[scoreKey] === "number" ? viewer[scoreKey] : 0) === topScore;
    }).length;
  }

  const partialData = leaderboardFailed || (period === "day" && viewers.length > 0 && !hasDayFields);

  return {
    period: period,
    uniqueViewers: uniqueViewers,
    totalMessages: totalMessages,
    totalScore: totalScore,
    topScore: topScore,
    topScorer: topScorer,
    tiedTopCount: tiedTopCount,
    hasDayFields: hasDayFields,
    leaderboardFailed: leaderboardFailed,
    partialData: partialData,
    hasViewers: uniqueViewers > 0,
    hasLeaderboard: !leaderboardFailed && entries.length > 0,
  };
}
