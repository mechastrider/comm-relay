/**
 * Pure helpers for the Audience workspace viewer table and empty states.
 */

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
 * @returns {{ score: number, messages: number }}
 */
export function viewerPeriodMetrics(viewer, period) {
  const row = viewer || {};
  if (period === "day") {
    return {
      score: Number(row.day_score) || 0,
      messages: Number(row.day_message_count) || 0,
    };
  }
  if (period === "all") {
    return {
      score: Number(row.score) || 0,
      messages: Number(row.message_count) || 0,
    };
  }
  return {
    score: Number(row.session_score) || 0,
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
