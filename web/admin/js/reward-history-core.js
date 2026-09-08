/**
 * Small state machine shared by the global and viewer-scoped reward journals.
 * It intentionally owns no DOM so request ordering can be tested without a browser.
 */
export class RewardHistoryController {
  /**
   * @param {{ fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<{ entries?: unknown[], next_cursor?: string | null }>, onChange: (state: { entries: unknown[], nextCursor: string | null, loading: boolean, loadingMore: boolean, error: Error | null, errorRequest: string | null, hasLoaded: boolean }) => void }} options
   */
  constructor(options) {
    this.fetchPage = options.fetchPage;
    this.onChange = options.onChange;
    this.entries = [];
    this.nextCursor = null;
    this.loading = false;
    this.loadingMore = false;
    this.error = null;
    this.errorRequest = null;
    this.hasLoaded = false;
    this.request = null;
    this.generation = 0;
  }

  snapshot() {
    return {
      entries: this.entries.slice(),
      nextCursor: this.nextCursor,
      loading: this.loading,
      loadingMore: this.loadingMore,
      error: this.error,
      errorRequest: this.errorRequest,
      hasLoaded: this.hasLoaded,
    };
  }

  publish() {
    this.onChange(this.snapshot());
  }

  cancel() {
    this.generation += 1;
    if (this.request) {
      this.request.abort();
      this.request = null;
    }
    this.loading = false;
    this.loadingMore = false;
    this.publish();
  }

  async loadFirst() {
    this.cancel();
    const generation = this.generation;
    const controller = new AbortController();
    this.request = controller;
    this.loading = true;
    this.loadingMore = false;
    this.error = null;
    this.errorRequest = null;
    this.publish();

    try {
      const payload = await this.fetchPage(null, controller.signal);
      if (generation !== this.generation || controller.signal.aborted) {
        return;
      }
      this.entries = Array.isArray(payload && payload.entries) ? payload.entries : [];
      this.nextCursor = payload && payload.next_cursor ? String(payload.next_cursor) : null;
      this.hasLoaded = true;
    } catch (error) {
      if (generation !== this.generation || controller.signal.aborted) {
        return;
      }
      this.error = error instanceof Error ? error : new Error(String(error));
      this.errorRequest = "first";
      this.hasLoaded = true;
    } finally {
      if (generation === this.generation && this.request === controller) {
        this.request = null;
        this.loading = false;
        this.publish();
      }
    }
  }

  async loadMore() {
    if (this.loading || this.loadingMore || !this.nextCursor) {
      return;
    }
    const generation = this.generation;
    const cursor = this.nextCursor;
    const controller = new AbortController();
    this.request = controller;
    this.loadingMore = true;
    this.error = null;
    this.errorRequest = null;
    this.publish();

    try {
      const payload = await this.fetchPage(cursor, controller.signal);
      if (generation !== this.generation || controller.signal.aborted) {
        return;
      }
      const entries = Array.isArray(payload && payload.entries) ? payload.entries : [];
      this.entries = this.entries.concat(entries);
      this.nextCursor = payload && payload.next_cursor ? String(payload.next_cursor) : null;
      this.hasLoaded = true;
    } catch (error) {
      if (generation !== this.generation || controller.signal.aborted) {
        return;
      }
      this.error = error instanceof Error ? error : new Error(String(error));
      this.errorRequest = "more";
    } finally {
      if (generation === this.generation && this.request === controller) {
        this.request = null;
        this.loadingMore = false;
        this.publish();
      }
    }
  }
}

/** Owns one viewer-scoped controller and makes selection changes explicitly destructive. */
export class ViewerRewardHistorySession {
  constructor() {
    this.viewerId = null;
    this.controller = null;
  }

  /** @param {string} viewerId @param {RewardHistoryController} controller */
  begin(viewerId, controller) {
    this.cancel();
    this.viewerId = viewerId;
    this.controller = controller;
    controller.loadFirst();
    return controller;
  }

  cancel() {
    if (this.controller) {
      this.controller.cancel();
    }
    this.viewerId = null;
    this.controller = null;
  }
}

export function rewardHistoryURL(viewerId, limit, cursor) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (viewerId) {
    query.set("viewer_id", viewerId);
  }
  if (cursor) {
    query.set("cursor", cursor);
  }
  return "/api/reward-history?" + query.toString();
}

function normalizeViewerFilterValue(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

/**
 * Builds stable, human-readable datalist options while keeping duplicate names selectable.
 * @param {unknown[]} viewers
 * @param {(platform: string) => string} platformLabel
 */
export function buildViewerFilterOptions(viewers, platformLabel) {
  const candidates = (Array.isArray(viewers) ? viewers : []).flatMap(function (viewer) {
    const id = String(viewer && viewer.id || "").trim();
    if (!id) {
      return [];
    }
    const displayName = String(viewer && viewer.display_name || "").trim() || id;
    const platforms = Array.isArray(viewer && viewer.platforms) ? viewer.platforms : [];
    const readablePlatforms = platforms.map(function (platform) {
      const value = String(platform || "").trim();
      return value ? platformLabel(value) : "";
    }).filter(Boolean);
    const baseLabel = readablePlatforms.length > 0
      ? displayName + " · " + readablePlatforms.join(", ")
      : displayName;
    return [{ id: id, displayName: displayName, baseLabel: baseLabel }];
  });
  const counts = new Map();
  candidates.forEach(function (candidate) {
    const key = normalizeViewerFilterValue(candidate.baseLabel);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return candidates.map(function (candidate) {
    const duplicate = counts.get(normalizeViewerFilterValue(candidate.baseLabel)) > 1;
    return {
      id: candidate.id,
      displayName: candidate.displayName,
      label: duplicate ? candidate.baseLabel + " · " + candidate.id : candidate.baseLabel,
    };
  });
}

/** @param {{ id: string, displayName: string, label: string }[]} options @param {string} value */
export function resolveViewerFilter(options, value) {
  const query = normalizeViewerFilterValue(value);
  if (!query) {
    return null;
  }
  const exactLabel = options.find(function (option) {
    return normalizeViewerFilterValue(option.label) === query;
  });
  if (exactLabel) {
    return exactLabel;
  }
  const nameMatches = options.filter(function (option) {
    return normalizeViewerFilterValue(option.displayName) === query;
  });
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

export function formatRewardHistoryTime(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatSignedPoints(points) {
  const numeric = Number(points) || 0;
  return (numeric > 0 ? "+" : "") + String(numeric) + " XP";
}
