// Pure reward history formatting, filtering and URL helpers.
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
