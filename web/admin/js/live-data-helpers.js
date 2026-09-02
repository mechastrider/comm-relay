/**
 * Pure state helpers for Live workspace leaderboard frames and statistics
 * invalidation. Keeping timing and period filtering here makes the browser
 * lifecycle straightforward to exercise without a DOM.
 */

const PERIODS = new Set(["session", "day", "all"]);

/**
 * @param {unknown} value
 * @returns {"session"|"day"|"all"|null}
 */
export function leaderboardPeriodFrom(value) {
  return PERIODS.has(value) ? /** @type {"session"|"day"|"all"} */ (value) : null;
}

/**
 * Stores only the latest complete leaderboard frame for every period.
 *
 * @returns {{ remember: (frame: unknown) => ({ period: "session"|"day"|"all", entries: Array<Record<string, unknown>> } | null), get: (period: unknown) => ({ period: "session"|"day"|"all", entries: Array<Record<string, unknown>> } | null) }}
 */
export function createLeaderboardSnapshotCache() {
  /** @type {Map<string, { period: "session"|"day"|"all", entries: Array<Record<string, unknown>> }>} */
  const snapshots = new Map();

  return {
    remember(frame) {
      if (!frame || typeof frame !== "object") {
        return null;
      }
      const raw = /** @type {Record<string, unknown>} */ (frame);
      const period = leaderboardPeriodFrom(raw.period);
      if (!period || !Array.isArray(raw.entries)) {
        return null;
      }
      const snapshot = {
        period,
        entries: /** @type {Array<Record<string, unknown>>} */ (raw.entries),
      };
      snapshots.set(period, snapshot);
      return snapshot;
    },
    get(period) {
      const normalized = leaderboardPeriodFrom(period);
      return normalized ? snapshots.get(normalized) || null : null;
    },
  };
}

// Determines whether a period transition may retain rendered rows. Rows are
// meaningful only for the period that produced them; a new uncached period
// therefore starts in the normal loading/empty state instead of showing data
// from the previous selection after an HTTP error.
export function leaderboardPeriodTransition(renderedPeriod, nextPeriod, hasCachedSnapshot) {
  const samePeriod = renderedPeriod === nextPeriod;
  return {
    preserveRowsOnError: samePeriod || hasCachedSnapshot,
    clearRows: !samePeriod && !hasCachedSnapshot,
    showLoading: !samePeriod && !hasCachedSnapshot,
  };
}

/**
 * Debounces live-data invalidation without allowing a refresh more often than
 * the configured interval. The caller owns HTTP cancellation and resolves the
 * returned revision when that request completes.
 *
 * @param {{ now?: () => number, setTimeoutFn?: (callback: () => void, delay: number) => unknown, clearTimeoutFn?: (timer: unknown) => void, refresh: (revision: number) => void, minIntervalMs?: number }} options
 */
export function createStatisticsInvalidator(options) {
  const now = options.now || Date.now;
  const setTimeoutFn = options.setTimeoutFn || function (callback, delay) {
    return window.setTimeout(callback, delay);
  };
  const clearTimeoutFn = options.clearTimeoutFn || function (timer) {
    window.clearTimeout(/** @type {number} */ (timer));
  };
  const minimumInterval = options.minIntervalMs || 1000;

  let active = false;
  let dirty = true;
  let refreshing = false;
  let timer = null;
  let revision = 0;
  let lastRefreshAt = -Infinity;
  let nextRefreshId = 0;
  let activeRefreshId = 0;
  let activeRefreshRevision = 0;

  function clearTimer() {
    if (timer !== null) {
      clearTimeoutFn(timer);
      timer = null;
    }
  }

  function schedule() {
    if (!active || !dirty || refreshing || timer !== null) {
      return;
    }
    const delay = Math.max(0, lastRefreshAt + minimumInterval - now());
    timer = setTimeoutFn(function () {
      timer = null;
      if (!active || !dirty || refreshing) {
        return;
      }
      const refreshRevision = beginRefresh();
      options.refresh(refreshRevision);
    }, delay);
  }

  function beginRefresh() {
    clearTimer();
    refreshing = true;
    lastRefreshAt = now();
    nextRefreshId += 1;
    activeRefreshId = nextRefreshId;
    activeRefreshRevision = revision;
    return activeRefreshId;
  }

  return {
    /** @param {boolean} isActive */
    invalidate(isActive) {
      active = Boolean(isActive);
      dirty = true;
      revision += 1;
      schedule();
      return revision;
    },
    /** @param {boolean} isActive */
    setActive(isActive) {
      active = Boolean(isActive);
      if (!active) {
        clearTimer();
        return;
      }
      schedule();
    },
    beginRefresh,
    /** @param {number} refreshId @param {boolean} succeeded */
    finishRefresh(refreshId, succeeded) {
      if (refreshId !== activeRefreshId) {
        return;
      }
      refreshing = false;
      if (succeeded && activeRefreshRevision === revision) {
        dirty = false;
      }
      if (succeeded) {
        schedule();
      }
    },
    cancel() {
      clearTimer();
      refreshing = false;
    },
    isDirty() {
      return dirty;
    },
  };
}
