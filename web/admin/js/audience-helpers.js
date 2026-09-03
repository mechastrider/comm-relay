/**
 * Pure helpers for the Audience workspace viewer table and empty states.
 */

export const AUDIENCE_SORT_STORAGE_KEY = "commRelay.audienceSort";

/** @typedef {"viewer"|"xp"|"messages"} AudienceSortColumn */
/** @typedef {"asc"|"desc"} AudienceSortDirection */
/** @typedef {{ column: AudienceSortColumn|null, direction: AudienceSortDirection }} AudienceSortState */

/**
 * @param {unknown} raw
 * @returns {AudienceSortState}
 */
export function normalizeAudienceSort(raw) {
  if (!raw || typeof raw !== "object") {
    return { column: null, direction: "desc" };
  }
  const value = /** @type {Record<string, unknown>} */ (raw);
  const column = value.column;
  const direction = value.direction;
  const normalizedColumn =
    column === "viewer" || column === "xp" || column === "messages"
      ? column
      : column === "score"
        ? "xp"
        : null;
  const normalizedDirection = direction === "asc" ? "asc" : "desc";
  return {
    column: normalizedColumn,
    direction: normalizedDirection,
  };
}

/**
 * @param {Storage | null | undefined} storage
 * @returns {AudienceSortState}
 */
export function readAudienceSort(storage) {
  try {
    if (!storage || typeof storage.getItem !== "function") {
      return normalizeAudienceSort(null);
    }
    const raw = storage.getItem(AUDIENCE_SORT_STORAGE_KEY);
    if (!raw) {
      return normalizeAudienceSort(null);
    }
    return normalizeAudienceSort(JSON.parse(raw));
  } catch {
    return normalizeAudienceSort(null);
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {AudienceSortState} sort
 * @returns {boolean}
 */
export function writeAudienceSort(storage, sort) {
  try {
    if (!storage || typeof storage.setItem !== "function") {
      return false;
    }
    const normalized = normalizeAudienceSort(sort);
    storage.setItem(AUDIENCE_SORT_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {AudienceSortState} current
 * @param {AudienceSortColumn} column
 * @returns {AudienceSortState}
 */
export function nextAudienceSort(current, column) {
  const sort = normalizeAudienceSort(current);
  if (sort.column !== column) {
    return { column: column, direction: "desc" };
  }
  if (sort.direction === "desc") {
    return { column: column, direction: "asc" };
  }
  return { column: null, direction: "desc" };
}

/**
 * @param {AudienceSortState} sort
 * @param {AudienceSortColumn} column
 * @returns {"none"|"ascending"|"descending"}
 */
export function audienceSortAriaValue(sort, column) {
  const normalized = normalizeAudienceSort(sort);
  if (normalized.column !== column) {
    return "none";
  }
  return normalized.direction === "asc" ? "ascending" : "descending";
}

/**
 * @param {Record<string, unknown> | null | undefined} viewer
 * @returns {string[]}
 */
export function viewerPlatformsList(viewer) {
  const row = viewer || {};
  const platforms = row.platforms;
  if (Array.isArray(platforms)) {
    const seen = new Set();
    const result = [];
    platforms.forEach(function (platform) {
      const id = String(platform || "").toLowerCase();
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      result.push(id);
    });
    return result;
  }

  const lastSeen = row.last_seen;
  const lastPlatform =
    lastSeen && typeof lastSeen === "object"
      ? String(/** @type {Record<string, unknown>} */ (lastSeen).platform || "").toLowerCase()
      : "";
  if (lastPlatform) {
    return [lastPlatform];
  }
  return [];
}

/**
 * @param {Record<string, unknown>} viewer
 * @returns {string}
 */
function viewerSortKey(viewer) {
  return String(viewer.display_name || "").trim().toLocaleLowerCase();
}

/**
 * @param {Array<Record<string, unknown>>} viewers
 * @param {AudienceSortState} sort
 * @param {"session"|"day"|"all"} period
 * @returns {Array<Record<string, unknown>>}
 */
export function sortAudienceViewers(viewers, sort, period) {
  const normalized = normalizeAudienceSort(sort);
  if (!normalized.column || !Array.isArray(viewers) || viewers.length < 2) {
    return Array.isArray(viewers) ? viewers.slice() : [];
  }

  const column = normalized.column;
  const direction = normalized.direction === "asc" ? 1 : -1;
  return viewers.slice().sort(function (left, right) {
    if (column === "viewer") {
      const nameCompare = viewerSortKey(left).localeCompare(viewerSortKey(right), undefined, {
        sensitivity: "base",
      });
      if (nameCompare !== 0) {
        return nameCompare * direction;
      }
      return String(left.id || "").localeCompare(String(right.id || ""), undefined, {
        sensitivity: "base",
      });
    }

    const leftMetrics = viewerPeriodMetrics(left, period);
    const rightMetrics = viewerPeriodMetrics(right, period);
    const leftValue = column === "xp" ? leftMetrics.xp : leftMetrics.messages;
    const rightValue = column === "xp" ? rightMetrics.xp : rightMetrics.messages;
    if (leftValue === rightValue) {
      return 0;
    }
    return leftValue < rightValue ? -direction : direction;
  });
}

/**
 * @param {{ loading?: boolean, error?: boolean, query?: string, count?: number }} input
 * @returns {"loading"|"error"|"none"|"no-matches"|"ready"}
 */
export function audienceEmptyKind(input) {
  if (input.loading) {
    return "loading";
  }
  if (input.error) {
    return "error";
  }
  const count = typeof input.count === "number" ? input.count : 0;
  if (count === 0) {
    return String(input.query || "").trim() !== "" ? "no-matches" : "none";
  }
  return "ready";
}

/**
 * @param {Record<string, unknown> | null | undefined} viewer
 * @param {"session"|"day"|"all"} period
 * @returns {{ xp: number, messages: number }}
 */
export function viewerPeriodMetrics(viewer, period) {
  const row = viewer || {};
  if (period === "day") {
    return {
      xp: Number(row.day_xp) || 0,
      messages: Number(row.day_message_count) || 0,
    };
  }
  if (period === "all") {
    return {
      xp: Number(row.xp) || 0,
      messages: Number(row.message_count) || 0,
    };
  }
  return {
    xp: Number(row.session_xp) || 0,
    messages: Number(row.session_message_count) || 0,
  };
}

/**
 * @param {Array<{ platform?: string }> | null | undefined} identities
 * @param {(platform: string) => string} formatPlatformLabel
 * @returns {string}
 */
export function formatPlatformSummary(identities, formatPlatformLabel) {
  if (!identities || identities.length === 0) {
    return "";
  }
  const seen = new Set();
  const labels = [];
  identities.forEach(function (identity) {
    const platform = String(identity.platform || "").toLowerCase();
    if (!platform || seen.has(platform)) {
      return;
    }
    seen.add(platform);
    labels.push(formatPlatformLabel(platform));
  });
  return labels.join(", ");
}

/**
 * @param {Record<string, unknown> | null | undefined} viewer
 * @param {(platform: string) => string} formatPlatformLabel
 * @returns {string}
 */
export function formatViewerPlatforms(viewer, formatPlatformLabel) {
  const fromIdentities = formatPlatformSummary(
    /** @type {Array<{ platform?: string }> | null | undefined} */ (
      viewer && viewer.identities
    ),
    formatPlatformLabel
  );
  if (fromIdentities) {
    return fromIdentities;
  }
  const lastSeen = viewer && viewer.last_seen;
  const platform =
    lastSeen && typeof lastSeen === "object"
      ? /** @type {Record<string, unknown>} */ (lastSeen).platform
      : "";
  if (typeof platform === "string" && platform) {
    return formatPlatformLabel(platform);
  }
  return "";
}

/**
 * @param {string} displayName
 * @returns {string | null} validation message key or null when valid
 */
export function validateDisplayName(displayName) {
  if (String(displayName || "").trim() === "") {
    return "viewers.nameRequired";
  }
  return null;
}

/**
 * @param {string} trigger
 * @returns {string | null} validation message key or null when valid
 */
export function validateCommandTrigger(trigger) {
  const value = String(trigger || "").trim().toLowerCase();
  if (value === "") {
    return "commands.triggerRequired";
  }
  if (value.includes("!") || /\s/.test(value)) {
    return "commands.triggerInvalid";
  }
  if (!/^[a-z0-9_]{1,32}$/.test(value)) {
    return "commands.triggerInvalid";
  }

  return null;
}

/**
 * @param {number | string} points
 * @returns {string | null} validation message key or null when valid
 */
export function validateAwardPoints(points) {
  const value = Number(points);
  if (!Number.isFinite(value) || value < 1) {
    return "awards.pointsInvalid";
  }

  return null;
}
